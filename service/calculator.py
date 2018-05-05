import numpy as np
import pandas as pd


def calc_betas(df):
    covariance = np.cov(df.values.T)
    betas = covariance[1:,0]/covariance[0,0]
    return betas


def roll(df, window):
    for i in range(df.shape[0] - window):
        yield pd.DataFrame(df[i:i+window+1])


def calculate(collection, window):
    collection = collection.pct_change().fillna(method='backfill', limit=10)
    columns = list(collection.columns)
    columns.remove('MKT')
    collection_copy = collection[columns].copy()
    collection['Aggregate'] = collection_copy.mean(numeric_only=True, axis=1)

    betas_set = [calc_betas(sub_frame) for sub_frame in roll(collection, window)]
    stacked = np.stack(betas_set)
    columns = collection.columns[1:]

    return pd.DataFrame(stacked, columns=columns, index = collection.index[window:]).sort_index()


