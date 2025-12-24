
import sys
try:
    import pandas as pd
    import numpy as np
    print(f"Pandas version: {pd.__version__}")
    print(f"Numpy version: {np.__version__}")
except ImportError as e:
    print(f"ImportError: {e}")
