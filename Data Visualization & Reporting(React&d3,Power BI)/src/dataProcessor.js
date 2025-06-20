// dataProcessor.js
import products from './amazon_cleaned.json';

export const loadData = async () => {
  try {
    // Log the raw imported data
    console.log("Imported products:", products);

    const data = products;

    console.log("Number of rows loaded:", data.length);
    console.log("First 5 rows of loaded data:", data.slice(0, 5));

    if (!data) {
      throw new Error("Imported data is undefined or null. Check if amazon_cleaned.json exists and is properly formatted.");
    }

    if (!Array.isArray(data)) {
      throw new Error("Imported data is not an array. Check the structure of amazon_cleaned.json.");
    }

    if (!data.length) {
      throw new Error("Dataset is empty. Check if amazon_cleaned.json has data.");
    }

    const requiredColumns = ['discounted_price', 'category', 'product_name', 'discount_percentage', 'rating_cleaned'];
    requiredColumns.forEach(col => {
      if (!data[0].hasOwnProperty(col)) {
        throw new Error(`Column '${col}' not found in the dataset. Available columns: ${Object.keys(data[0])}`);
      }
    });

    const processedData = data.map(item => {
      // discounted_price is already a number
      const discountedPrice = item.discounted_price != null && item.discounted_price !== ''
        ? parseFloat(item.discounted_price)
        : 0;

      // discount_percentage is a float between 0 and 1, convert to percentage (0 to 100)
      const discountPercentage = item.discount_percentage != null && item.discount_percentage !== ''
        ? parseFloat(item.discount_percentage) * 100 // Convert 0.64 to 64
        : 0;

      // rating_cleaned is already a number
      const rating = item.rating_cleaned != null && item.rating_cleaned !== ''
        ? parseFloat(item.rating_cleaned)
        : 0;

      return {
        ...item,
        discounted_price: discountedPrice,
        discount_percentage: discountPercentage,
        rating: rating,
        quantity_sold: 1,
        sale_date: randomDate(),
      };
    });

    processedData.forEach(item => {
      const date = new Date(item.sale_date);
      item.month = date.toLocaleString('default', { month: 'long' });
    });

    processedData.forEach(item => {
      item.revenue = item.discounted_price * item.quantity_sold;
    });

    processedData.forEach(item => {
      const categories = item.category ? item.category.split('|') : ['Unknown', 'Unknown'];
      item.main_category = categories[0];
      item.subcategory = categories[categories.length - 1];
    });

    console.log("First 5 rows of processed data:", processedData.slice(0, 5));

    return processedData;
  } catch (error) {
    console.error("Error loading or processing data:", error);
    return [];
  }
};

function randomDate() {
  const start = new Date(2024, 0, 1);
  const end = new Date(2024, 11, 31);
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date;
}