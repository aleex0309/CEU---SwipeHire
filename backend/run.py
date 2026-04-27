"""
Entry-point script — run with:

    python run.py
or
    uvicorn app.main:app --reload

Env vars
--------
RESUME_CSV_PATH — absolute path to resume_data.csv
                  (defaults to ../resume_data.csv relative to this script)
HOST            — bind host (default 0.0.0.0)
PORT            — bind port (default 8000)
"""

import os
import uvicorn

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=False,        # set to True during development for auto-reload
        log_level="info",
    )
