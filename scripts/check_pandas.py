try:
    import numpy as np
    import pandas as pd

    print(f"Pandas version: {pd.__version__}")  # noqa: T201
    print(f"Numpy version: {np.__version__}")  # noqa: T201
except ImportError as e:
    print(f"ImportError: {e}")  # noqa: T201
