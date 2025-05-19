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

# Create table if not exists
cur.execute("""
    CREATE TABLE IF NOT EXISTS amazon_products (
        product_id VARCHAR PRIMARY KEY,
        product_name TEXT,
        category TEXT,
        discounted_price VARCHAR,
        actual_price VARCHAR,
        discount_percentage VARCHAR,
        rating FLOAT,
        rating_count INTEGER,
        about_product TEXT,
        user_id TEXT,
        user_name TEXT,
        review_id TEXT,
        review_title TEXT,
        review_content TEXT,
        img_link TEXT,
        product_link TEXT
    );
""")
conn.commit()
print("🛠️ Table 'amazon_products' checked/created.")

# Create Kafka Consumer
consumer = KafkaConsumer(
    'amazon-products',
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
        # Safely convert rating to float
        rating = data["rating"]
        try:
            rating = float(rating) if rating and rating != '|' else 0.0
        except (ValueError, TypeError):
            rating = 0.0  # Default to 0.0 if conversion fails

        # Safely convert rating_count to integer
        rating_count = data["rating_count"]
        try:
            rating_count = int(float(rating_count)) if rating_count and rating_count != 'nan' else 0
        except (ValueError, TypeError):
            rating_count = 0  # Default to 0 if conversion fails

        cur.execute("""
            INSERT INTO amazon_products (
                product_id, product_name, category, discounted_price, actual_price,
                discount_percentage, rating, rating_count, about_product, user_id,
                user_name, review_id, review_title, review_content, img_link, product_link
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (product_id) DO NOTHING
        """, (
            data["product_id"], data["product_name"], data["category"],
            data["discounted_price"], data["actual_price"], data["discount_percentage"],
            rating, rating_count, data["about_product"],
            data["user_id"], data["user_name"], data["review_id"], data["review_title"],
            data["review_content"], data["img_link"], data["product_link"]
        ))

        conn.commit()
        print(f"✅ Inserted: {data['product_id']}")
    except Exception as e:
        print(f"❌ Error inserting data: {e}")
        print(f"Problematic data: {data}")
        conn.rollback()

# Close the connection when done
cur.close()
conn.close()