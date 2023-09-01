[Pages](https://infovis.pages.enterpriselab.ch/hs22/g04/index.html)

Python code used to parse the data:

```python
from pathlib import Path

import pandas as pd


source_data_path = Path.home() / 'Desktop' / 'owid-co2-data.csv'
output_directory = Path.home() / 'Desktop'
df = pd.read_csv(source_data_path)


searched_columns = ['gdp', 'co2', 'co2_per_gdp']

columns = ['year', 'country'] + searched_columns
df = df[columns]

for searched_column in searched_columns:
    pivot_table = pd.pivot_table(df, values=searched_column, index='year', columns='country')
    pivot_table.to_csv(output_directory / f'{searched_column}.csv')


```

# DAVI
