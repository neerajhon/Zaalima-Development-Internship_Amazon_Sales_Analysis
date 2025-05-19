import pandas as pd
import numpy as np
from extract import extract_data

print("🚀 Starting data transformation for Amazon dataset...")


# Extract
df = extract_data()
print(f"\n📊 Extracted {len(df)} rows.")


# Check missing values
print("\n🔍 Missing values before handling:")
print(df.isnull().sum())

# Handle missing values
#  -  Important:  Adapt these based on your data analysis choices
#  -  I'm providing examples; you might need different strategies
if 'rating_count' in df.columns:
    df['rating_count'] = df['rating_count'].fillna(0)  # Filling with 0 (or median, mean, etc.)
if 'category' in df.columns:
    df['category'] = df['category'].fillna('Unknown') # Filling with 'Unknown' or most frequent category
if 'discount_percentage' in df.columns:
    df['discount_percentage'] = df['discount_percentage'].fillna(0) #Filling with 0 if missing

print("\n✅ After handling missing values:")
print(df.isnull().sum())

# Remove duplicates
df.drop_duplicates(inplace=True)
print(f"\n🧹 Removed duplicates. Current row count: {len(df)} ")

# Rename columns
#  -  Adjust these to match your preferred naming conventions
rename_dict = {
    'product_id': 'ProductID',
    'product_name': 'ProductName',
    'category': 'Category',
    'discounted_price': 'DiscountedPrice',
    'actual_price': 'ActualPrice',
    'discount_percentage': 'DiscountPercentage',
    'rating': 'Rating',
    'rating_count': 'RatingCount',
    'about_product': 'AboutProduct',
    'user_id': 'UserID',
    'user_name': 'UserName',
    'review_id': 'ReviewID',
    'review_title': 'ReviewTitle',
    'review_content': 'ReviewContent',
    'img_link': 'ImageLink',
    'product_link': 'ProductLink'
}
df.rename(columns=rename_dict, inplace=True, errors='ignore') # Added errors='ignore'


# Final data type conversions (important!)
#  -  Make sure prices and ratings are numeric
if 'DiscountedPrice' in df.columns:
    df['DiscountedPrice'] = df['DiscountedPrice'].astype(str).str.replace('₹', '', regex=False).str.replace(',', '', regex=False)
    df['DiscountedPrice'] = pd.to_numeric(df['DiscountedPrice'], errors='coerce')
if 'ActualPrice' in df.columns:
    df['ActualPrice'] = df['ActualPrice'].astype(str).str.replace('₹', '', regex=False).str.replace(',', '', regex=False)
    df['ActualPrice'] = pd.to_numeric(df['ActualPrice'], errors='coerce')
if 'Rating' in df.columns:
    df['Rating'] = pd.to_numeric(df['Rating'], errors='coerce')
if 'DiscountPercentage' in df.columns:
    df['DiscountPercentage'] = pd.to_numeric(df['DiscountPercentage'], errors='coerce')


# Final preview
print("\n🧼 Cleaned data preview:")
print(df.head())
print("\nData types after cleaning:")
print(df.info())


# Save
df.to_csv("data/transformed_amazon_data.csv", index=False)  # Changed filename to be more specific
print("\n📁 Transformed data saved to 'transformed_amazon_data.csv'")