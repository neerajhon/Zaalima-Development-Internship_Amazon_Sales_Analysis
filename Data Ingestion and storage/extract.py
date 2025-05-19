import pandas as pd
from sqlalchemy import create_engine

def extract_data():
    engine = create_engine('postgresql://postgres:postgres@localhost:5433/batch_db')

    with engine.connect() as conn:
        df = pd.read_sql("SELECT * FROM public.amazon_products", conn.connection)

    print("✅ Data extracted from PostgreSQL:")
    print(df.head())  # Display first 5 rows
    
    return df

if __name__ == "__main__":
    extract_data()

