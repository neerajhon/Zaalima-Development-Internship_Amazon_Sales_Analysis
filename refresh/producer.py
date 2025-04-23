from kafka import KafkaProducer
import json
import pandas as pd
import time

# Load CSV
df = pd.read_csv("E-commerce Customer Behavior.csv")

# Convert boolean columns if needed
df['Discount Applied'] = df['Discount Applied'].astype(bool)

producer = KafkaProducer(
    bootstrap_servers='localhost:9092',
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

batch_size = 100
topic = 'test-topic'

for i in range(0, len(df), batch_size):
    batch_df = df.iloc[i:i + batch_size]
    records = batch_df.to_dict(orient='records')
    for record in records:
        producer.send(topic, value=record)
    producer.flush()
    print(f"✅ Sent batch of {len(records)}")
    time.sleep(1)

producer.close()
