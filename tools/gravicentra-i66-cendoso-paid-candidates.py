#!/usr/bin/env python3
"""Deterministic, read-only Cendoso payment-evidence intake for I6.6.

Creates candidates only. This script does not access Firestore, authorize a
payment, reconcile an insurer account, or write any operational record.
"""

from __future__ import annotations

import argparse
import datetime as dt
import gzip
import hashlib
import io
import json
import re
import zipfile
from collections import Counter, defaultdict
from decimal import Decimal, InvalidOperation
from pathlib import Path

from openpyxl import load_workbook


HEADERS = {
    "policy": 0,
    "endorsement": 1,
    "insurer": 19,
    "line": 20,
    "coverageStart": 11,
    "coverageEnd": 12,
    "issueDate": 13,
    "receiptPeriodStart": 23,
    "receiptDueDate": 24,
    "receiptFolio": 9,
    "paymentFrequency": 26,
    "netPremium": 29,
    "issuanceExpense": 30,
    "financingSurcharge": 31,
    "discount": 32,
    "tax": 33,
    "totalPremium": 36,
    "currency": 37,
    "actualPaidDate": 42,
    "policyStatus": 43,
}


def literal(value) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def date(value) -> str:
    if isinstance(value, (dt.datetime, dt.date)):
        return value.date().isoformat() if isinstance(value, dt.datetime) else value.isoformat()
    raw = literal(value)
    for fmt in ("%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d"):
        try:
            return dt.datetime.strptime(raw, fmt).date().isoformat()
        except ValueError:
            pass
    return ""


def amount(value) -> str:
    raw = literal(value).replace(",", "")
    if not raw:
        return ""
    try:
        return format(Decimal(raw).quantize(Decimal("0.01")), "f")
    except (InvalidOperation, ValueError):
        return ""


def workbook(source: Path):
    # Some exported sheets contain the invalid XML alignment value "middle".
    # Repair this inside memory only, never the user's original XLSX.
    with zipfile.ZipFile(source) as original:
        memory = io.BytesIO()
        with zipfile.ZipFile(memory, "w") as normalized:
            for member in original.infolist():
                raw = original.read(member.filename)
                if member.filename == "xl/styles.xml":
                    raw = raw.replace(b'vertical="middle"', b'vertical="center"')
                normalized.writestr(member, raw)
        memory.seek(0)
        return load_workbook(memory, read_only=False, data_only=True)


def parse(sources: list[Path]) -> dict:
    candidates: dict[tuple[str, ...], dict] = {}
    file_records = []
    ignored_nonpayment = 0
    ignored_other_year = 0
    for source in sorted(sources, key=lambda path: path.name):
        blob = source.read_bytes()
        source_hash = hashlib.sha256(blob).hexdigest()
        wb = workbook(source)
        ws = wb.worksheets[0]
        header = [literal(cell) for cell in next(ws.iter_rows(min_row=10, max_row=10, values_only=True))]
        for field, position in HEADERS.items():
            if position >= len(header) or not header[position]:
                raise ValueError(f"Missing expected field {field} in {source.name} at index {position}")
        accepted = 0
        for row_number, row in enumerate(ws.iter_rows(min_row=11, values_only=True), start=11):
            paid_date = date(row[HEADERS["actualPaidDate"]])
            if not paid_date:
                ignored_nonpayment += 1
                continue
            if not paid_date.startswith("2026-"):
                ignored_other_year += 1
                continue
            record = {
                "insurerSource": literal(row[HEADERS["insurer"]]),
                "policyNumberSource": literal(row[HEADERS["policy"]]),
                "endorsementSource": literal(row[HEADERS["endorsement"]]),
                "coverageStart": date(row[HEADERS["coverageStart"]]),
                "coverageEnd": date(row[HEADERS["coverageEnd"]]),
                "issueDate": date(row[HEADERS["issueDate"]]),
                "receiptPeriodStart": date(row[HEADERS["receiptPeriodStart"]]),
                "receiptDueDate": date(row[HEADERS["receiptDueDate"]]),
                "receiptFolio": literal(row[HEADERS["receiptFolio"]]),
                "frequencySource": literal(row[HEADERS["paymentFrequency"]]),
                "lineSource": literal(row[HEADERS["line"]]),
                "netPremium": amount(row[HEADERS["netPremium"]]),
                "issuanceExpense": amount(row[HEADERS["issuanceExpense"]]),
                "financingSurcharge": amount(row[HEADERS["financingSurcharge"]]),
                "discount": amount(row[HEADERS["discount"]]),
                "tax": amount(row[HEADERS["tax"]]),
                "totalPremium": amount(row[HEADERS["totalPremium"]]),
                "currencySource": literal(row[HEADERS["currency"]]),
                "actualPaidDate": paid_date,
                "policyStatusSource": literal(row[HEADERS["policyStatus"]]),
            }
            key = (
                record["insurerSource"], record["policyNumberSource"],
                record["receiptPeriodStart"], record["receiptFolio"],
                record["totalPremium"], record["actualPaidDate"],
            )
            origin = {"file": source.name, "row": row_number, "sha256": source_hash}
            existing = candidates.get(key)
            if existing:
                existing["sourceRows"].append(origin)
                # A source spreadsheet's status/name can change between exports,
                # but conflicting financial/term fields cannot be silently merged.
                material = ("coverageStart", "coverageEnd", "receiptDueDate", "currencySource", "netPremium")
                if any(existing[field] != record[field] for field in material):
                    existing["materialSourceVariation"] = True
            else:
                record["sourceRows"] = [origin]
                record["materialSourceVariation"] = False
                record["candidateId"] = "cendoso_" + hashlib.sha256(
                    "|".join(key).encode("utf-8")
                ).hexdigest()[:24]
                candidates[key] = record
            accepted += 1
        file_records.append({"filename": source.name, "sha256": source_hash, "2026PaidRows": accepted})
        wb.close()

    dates_by_obligation: dict[tuple[str, ...], set[str]] = defaultdict(set)
    for key in candidates:
        dates_by_obligation[key[:-1]].add(key[-1])
    conflicts = {k for k, dates in dates_by_obligation.items() if len(dates) > 1}
    result = []
    for key, record in sorted(candidates.items()):
        reasons = []
        if key[:-1] in conflicts:
            reasons.append("CONFLICTING_SOURCE_PAID_DATES")
        if record["materialSourceVariation"]:
            reasons.append("CONFLICTING_SOURCE_TERM_OR_AMOUNT")
        if not record["policyNumberSource"] or not record["insurerSource"]:
            reasons.append("SOURCE_POLICY_OR_INSURER_MISSING")
        if not record["receiptPeriodStart"] or not record["totalPremium"]:
            reasons.append("SOURCE_PERIOD_OR_AMOUNT_MISSING")
        record["sourceRows"].sort(key=lambda ref: (ref["file"], ref["row"]))
        record["holdReasons"] = reasons
        record["preMatchStatus"] = "SOURCE_HOLD" if reasons else "AWAITING_CANONICAL_RECEIPT_MATCH_AND_OWNER_PROOF_RULE"
        result.append(record)

    statuses = Counter(row["preMatchStatus"] for row in result)
    by_insurer = Counter(row["insurerSource"] for row in result)
    return {
        "schemaVersion": "GRAVICENTRA_I6_6_CENDOSO_PAID_CANDIDATES_V1",
        "purpose": "Source-backed dry-run candidates only; NEVER direct payment posting authorization.",
        "canonicalReceiptMatchRequired": True,
        "ownerPaymentEvidenceSufficiencyQuestionPending": True,
        "sourceFolioReceiptEmptyInAllCandidateRows": all(not row["receiptFolio"] for row in result),
        "paymentDateSemantics": "Legacy report field Fecha Real Pagado; actual historical date claim, not inferred system application date.",
        "monetarySemantics": "Store netPremium and totalPremium separately; commission must use net premium; no artificial gross/net reconstruction.",
        "allowedNextStep": "Match exact tenant-insurer-policy-edition-receipt period and gross, existing payment dedupe and source proof, owner answer, protected CAS write with before-after, audit and rollback.",
        "sourceFiles": file_records,
        "counts": {
            "distinctPaidCandidates": len(result),
            "sourceEligibleForCanonicalMatch": statuses["AWAITING_CANONICAL_RECEIPT_MATCH_AND_OWNER_PROOF_RULE"],
            "sourceHeld": statuses["SOURCE_HOLD"],
            "conflictingPaidDateObligationGroups": len(conflicts),
            "ignoredNonpaymentRows": ignored_nonpayment,
            "ignoredNon2026PaidRows": ignored_other_year,
            "byInsurer": dict(sorted(by_insurer.items())),
        },
        "candidates": result,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--sources", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    selected = list(args.sources.glob("*CobranzaCendoso*.xlsx"))
    if len(selected) != 5:
        raise SystemExit(f"Expected exactly five original Cendoso sources; found {len(selected)}")
    artifact = parse(selected)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    raw = (json.dumps(artifact, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    if args.output.name.endswith(".json.gz"):
        args.output.write_bytes(gzip.compress(raw, compresslevel=9, mtime=0))
    else:
        args.output.write_bytes(raw)
    print(json.dumps(artifact["counts"], ensure_ascii=False))
