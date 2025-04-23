import pandas as pd
from extract import extract_data

print("🚀 Starting data transformation...")

# Extract
df = extract_data()
print(f"\n📊 Extracted {len(df)} rows.")

# Check missing values
print("\n🔍 Missing values:")
print(df.isnull().sum())

# Handle missing
df['age'].fillna(df['age'].mean(), inplace=True)
df.dropna(subset=['customerid'], inplace=True)
print("\n✅ After handling missing values:")
print(df.isnull().sum())

# Remove duplicates
df.drop_duplicates(inplace=True)

# Rename columns
df.rename(columns={
    'customerid': 'Customer ID',
    'gender': 'Gender',
    'age': 'Age',
    'city': 'City',
    'membership_type': 'Membership Type',
    'total_spend': 'Total Spend',
    'items_purchased': 'Items Purchased',
    'average_rating': 'Average Rating',
    'discount_applied': 'Discount Applied',
    'days_since_last_purchase': 'Days Since Last Purchase',
    'satisfaction_level': 'Satisfaction Level'
}, inplace=True)

# Outlier removal
df = df[(df['Age'] >= 10) & (df['Age'] <= 100)]

# Final preview
print("\n🧼 Cleaned data preview:")
print(df.head())

# Save
df.to_csv("data/transformed_data.csv", index=False)
print("\n📁 Transformed data saved to 'transformed_data.csv'")
