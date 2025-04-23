from kafka import KafkaConsumer
import json
import psycopg2

# Connect to PostgreSQL
conn = psycopg2.connect(
    host="localhost",
    port="5433",
    database="batch_db",
    user="postgres",
    password="postgres"
)
cur = conn.cursor()

# ✅ Create table if not exists
cur.execute("""
    CREATE TABLE IF NOT EXISTS customer_behavior (
        customerid VARCHAR PRIMARY KEY,
        gender VARCHAR,
        age INTEGER,
        city VARCHAR,
        membership_type VARCHAR,
        total_spend DOUBLE PRECISION,
        items_purchased INTEGER,
        average_rating DOUBLE PRECISION,
        discount_applied BOOLEAN,
        days_since_last_purchase INTEGER,
        satisfaction_level VARCHAR
    );
""")
conn.commit()
print("🛠️ Table 'customer_behavior' checked/created.")

# Create Kafka Consumer
consumer = KafkaConsumer(
    'test-topic',
    bootstrap_servers='localhost:9092',
    value_deserializer=lambda m: json.loads(m.decode('utf-8')),
    auto_offset_reset='earliest',
    enable_auto_commit=True
)

print("📥 Listening for messages from Kafka...")

# Consume messages and insert into PostgreSQL
for message in consumer:
    data = message.value

    try:
        cur.execute("""
            INSERT INTO customer_behavior (
                customerid, gender, age, city, membership_type,
                total_spend, items_purchased, average_rating,
                discount_applied, days_since_last_purchase, satisfaction_level
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (customerid) DO NOTHING
        """, (
            data["Customer ID"], data["Gender"], int(data["Age"]), data["City"],
            data["Membership Type"], float(data["Total Spend"]),
            int(data["Items Purchased"]), float(data["Average Rating"]),
            data["Discount Applied"] in ["TRUE", "True", "true", True],
            int(data["Days Since Last Purchase"]), data["Satisfaction Level"]
        ))

        conn.commit()
        print(f"✅ Inserted: {data['Customer ID']}")
    except Exception as e:
        print(f"❌ Error inserting data: {e}")
        conn.rollback()

# Close the connection when done
cur.close()
conn.close()

