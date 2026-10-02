# CotComp · Real quote evidence corpus · companion to S4.71

**Date:** 2026-10-02  
**Status:** source-only evidence library, no app-data access, no writes, no production.

The complete set of 16 insurer PDFs supplied by the Owner was reviewed and grouped by matching risk, not by upload order.

## Sanitized risk clusters

1. `GT_AUTO_YARIS_2008_37500`
   - 2 insurer documents;
   - 3 alternatives;
   - Aseguradora Guatemalteca and MAPFRE;
   - this is the only cluster matching the current W5 real QuoteCase family.

2. `GT_MOTO_PULSAR_NS400Z_2026_25000`
   - 4 insurer documents;
   - Seguros El Roble, Seguros Columna, MAPFRE and Aseguradora La Ceiba.

3. `GT_AUTO_CX5_2022_158000`
   - 4 insurer documents;
   - Seguros G&T, Seguros El Roble, Seguros Universales and Aseguradora General.

4. `GT_AUTO_CX5_2014_58000`
   - 5 insurer documents;
   - Seguros Bantrab, Aseguradora Rural, Aseguradora La Ceiba, Aseguradora Guatemalteca and Seguros Universales.
   - the Bantrab source has no usable premium and is preserved as missing rather than fabricated.
   - La Ceiba exposes two pricing columns whose plan labels require later human/source validation; temporary Plan A/Plan B labels are explicitly marked non-canonical.

5. `GT_AUTO_CRV_2002_35000`
   - 1 insurer document;
   - Seguros Columna.

## Corpus totals

- risk clusters: 5;
- source PDFs: 16;
- unique insurer families: 10;
- documentary alternatives: 19;
- motorcycle insurer sources: 4;
- sources with missing premium: 1;
- sources with unresolved plan labels: 1.

## Intended use

This corpus is retained as a non-PII test/evidence library for:
- insurer-document parsing;
- field normalization;
- multi-plan/multi-column handling;
- missing-data semantics;
- coverage/deductible/limit normalization;
- payment-plan normalization;
- regression tests for the future Cotizador/Comparador intake and comparison pipeline.

It must not be used to mix different people/risks into the active W5 case.

Only source SHA-256 values and non-PII risk/product facts are represented in code. Raw files and participant identifiers remain outside GitHub.
