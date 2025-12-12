# Prompt: Confirm backend sourcing logic for frontend data model

You are working in the `ha-pp-reader` repository. Re-open `frontend-datamodel-final.md` and iterate **row by row** through every table. For each line, populate the "Source logic confirmed" column with a short justification that references the exact artefacts proving the data source works.

Follow these rules while evaluating each row:

1. **General workflow**
   - Examine the "Data source back end" value of the current row and determine which of the six sourcing strategies applies.
   - Locate the canonical implementation or dataset that proves the value can be produced as documented.
   - Write a concise confirmation (or note required follow-up) in the new column before moving to the next row.

2. **If the source is option 1 (passed from portfolio file and stored in database)**
   - Open the protobuf schema under `portfolio_variables.yaml` and the generated Python classes used by `sync_from_pclient.py`.
   - Identify the exact message and field delivered by the portfolio file, including its datatype.
   - Confirm that the parser in `sync_from_pclient.py` stores the field in the matching database table/column and note both the proto path and storage destination.

3. **If the source is option 2 (Yahoo query live fetch stored in database)**
   - Inspect the sample datasets inside `.docs/yq_datasets/` that correspond to the relevant Yahoo Finance query.
   - Verify the field is present with realistic values and record the file(s) that demonstrate availability.
   - If needed, cite the module that persists the fetched value into the database.

4. **If the source is option 3 (Frankfurt APIFX fetch stored in database)**
   - Use established knowledge of the Frankfurter API or consult their public documentation to confirm the endpoint returns the required field.
   - Optionally reference existing integration code that already ingests Frankfurter data.
   - Document the endpoint or code path proving the value can be fetched and persisted.

5. **If the source is option 4 (calculated and stored inside the database)**
   - Evaluate the calculation complexity; confirm it can be handled efficiently by SQL or simple ORM expressions.
   - Reference the function, migration, or trigger that performs the calculation (or describe how to implement it) and justify why the logic remains maintainable in the database layer.

6. **If the source is option 5 (calculate from database values and write back)**
   - Decide whether the result is sufficiently stable that recalculations are infrequent (e.g., only when new transactions arrive).
   - Point to the service or job that updates and writes the value back, or outline the minimal logic required.
   - Mention why caching in the database is preferable versus recomputing on every request.

7. **If the source is option 6 (calculate from database values and hand to frontend)**
   - Determine which stored values feed the calculation and show that they are refreshed often enough for accurate live data.
   - Highlight any scheduled tasks or API handlers that execute the computation at request time.
   - Explain why keeping the computation in the live path is better than persisting it, especially for frequently changing metrics.

8. **Uncertainty handling**
   - When the evidence is incomplete, explicitly state what is missing and propose next steps (e.g., "Need unit test covering XYZ parser").
   - Keep each confirmation brief (one to two sentences) but specific enough that another contributor can follow the trail without additional digging.

Only proceed once you are confident that every row has either a confirmed source explanation or a clearly described follow-up action.
