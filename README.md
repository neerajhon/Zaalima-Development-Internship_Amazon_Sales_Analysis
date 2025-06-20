# 📦 Amazon Sales Data Analytics – Internship Project @ Zaalima Development(End-to-End Project)

This project presents a full-stack data analytics pipeline focused on **Amazon Sales Data**, developed as part of the **Zaalima Development Internship Program**. It integrates **real-time data ingestion**, **streaming analytics**, **AI-powered predictive models**, and **interactive dashboards** built with **React** and **Power BI**.

---
## 📦 Project Components

### 1. 🚀 Data Ingestion
- **Tools**: Apache Kafka, Python
- **Description**: Ingests real-time data from various sources such as CSV files, APIs, or IoT-like simulators into Kafka topics.
- **Output**: Kafka topic(s) like `zaalima-sales`, `user-activity`, etc.

### 2. 🌊 Streaming & Batch Processing
- **Tools**: Apache Spark Structured Streaming, Apache Airflow
- **Streaming**:
  - Reads messages from Kafka in real-time.
  - Cleans, transforms, and enriches the data.
  - Writes processed data to PostgreSQL and MongoDB.
- **Batch**:
  - Airflow DAGs schedule batch jobs for daily aggregations and ML model training.
  
### 3. 🧠 AI & Predictive Analysis
- **Tools**: Scikit-learn, XGBoost, TensorFlow
- **Models**:
  - Customer churn prediction
  - Sales forecasting
  - Product recommendation (Collaborative Filtering / NLP-based)
- **Storage**: Predictions saved in PostgreSQL or MongoDB for dashboard consumption.

### 4. 📊 Visualizations

#### 🔹 Power BI Dashboard
- KPIs: Revenue, Churn Rate, Sales Forecast, Customer Segmentation
- Data Source: PostgreSQL
- Interactivity: Slicers for time, region, product category

#### 🔸 React Analytics UI
- **Stack**: React.js + D3.js + TailwindCSS
- **Features**:
  - Live visual updates using WebSockets or REST APIs
  - Chart types: Line, Bar, Pie, Heatmap, Customer Journey
  - Export Options: PDF/Excel reports
- **Modules**:
  - Real-time sales trends
  - Predictive insights
  - Product performance heatmaps

---

## 🛠️ Tech Stack Summary

| Layer              | Tools/Tech                         |
|-------------------|-------------------------------------|
| Ingestion         | Apache Kafka, Python                |
| Streaming         | Apache Spark Structured Streaming   |
| Orchestration     | Apache Airflow                      |
| Storage           | PostgreSQL, MongoDB                 |
| ML & AI           | Scikit-learn, XGBoost, TensorFlow   |
| Dashboards        | Power BI, React + D3.js             |
| Reporting         | Pandas, ReportLab                   |

---

---

## 👤 Author

**Neeraj Velpula**  
📧 neeraj.velpula.dev@gmail.com  
🌍 India
