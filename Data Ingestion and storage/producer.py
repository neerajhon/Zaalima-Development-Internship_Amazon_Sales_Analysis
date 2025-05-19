from kafka import KafkaProducer
import json
import pandas as pd
import time
import numpy as np

def clean_price(price):
    if pd.isna(price):
        return '0'
    if isinstance(price, str):
        return price.replace('₹', '').replace(',', '')
    return str(price)

def clean_discount(discount):
    if pd.isna(discount):
        return '0'
    if isinstance(discount, str):
        return discount.replace('%', '')
    return str(discount)

# Load CSV
df = pd.read_csv("amazon.csv")

# Clean price and discount columns
df['discounted_price'] = df['discounted_price'].apply(clean_price)
df['actual_price'] = df['actual_price'].apply(clean_price)
df['discount_percentage'] = df['discount_percentage'].apply(clean_discount)

# Clean and convert rating
df['rating'] = pd.to_numeric(df['rating'].astype(str).str.replace('|', '0', regex=False), errors='coerce').fillna(0)

# Clean rating_count
df['rating_count'] = df['rating_count'].astype(str).str.replace(',', '', regex=False)  # Remove commas
df['rating_count'] = pd.to_numeric(df['rating_count'], errors='coerce').fillna(0).astype(int).astype(str)  # Convert to int, handle NaN, then back to string

# Initialize Kafka producer
producer = KafkaProducer(
    bootstrap_servers='localhost:9092',
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

batch_size = 100
topic = 'amazon-products'

for i in range(0, len(df), batch_size):
    batch_df = df.iloc[i:i + batch_size]
    records = batch_df.to_dict(orient='records')
    for record in records:
        producer.send(topic, value=record)
    producer.flush()
    print(f"✅ Sent batch of {len(records)}")
    time.sleep(1)

producer.close()