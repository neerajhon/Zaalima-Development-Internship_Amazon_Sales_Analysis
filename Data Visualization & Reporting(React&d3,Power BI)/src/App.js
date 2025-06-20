import React, { useEffect, useState } from 'react';
import * as d3 from 'd3';
import { loadData } from './dataProcessor';
import './App.css';

const App = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [mainCategory, setMainCategory] = useState('All');
  const [subcategory, setSubcategory] = useState('All');
  const [ratingRange, setRatingRange] = useState([0, 5]);
  const [discountRange, setDiscountRange] = useState([0, 100]);
  const [error, setError] = useState(null);

  // Load data on mount
  useEffect(() => {
    loadData().then(loadedData => {
      if (loadedData.length === 0) {
        setError("No data loaded. Please check the data file or console logs for errors. 😔");
      } else {
        console.log("Data state:", loadedData);
        setData(loadedData);
        setFilteredData(loadedData);
      }
    }).catch(err => {
      setError("Failed to load data: " + err.message + " 😥");
    });
  }, []);

  // Apply filters
  useEffect(() => {
    let tempData = [...data];
    if (mainCategory !== 'All') {
      tempData = tempData.filter(item => item.main_category === mainCategory);
    }
    if (subcategory !== 'All') {
      tempData = tempData.filter(item => item.subcategory === subcategory);
    }
    tempData = tempData.filter(item => item.rating >= ratingRange[0] && item.rating <= ratingRange[1]);
    tempData = tempData.filter(item => item.discount_percentage >= discountRange[0] && item.discount_percentage <= discountRange[1]);
    console.log("Filtered data:", tempData);
    setFilteredData(tempData);
  }, [mainCategory, subcategory, ratingRange, discountRange, data]);

  // Calculate KPIs
  const totalRevenue = filteredData.reduce((sum, item) => sum + (item.revenue || 0), 0);
  const totalQuantity = filteredData.reduce((sum, item) => sum + (item.quantity_sold || 0), 0);
  const totalTransactions = filteredData.length;
  const averageDiscount = filteredData.length
    ? filteredData.reduce((sum, item) => sum + (item.discount_percentage || 0), 0) / filteredData.length
    : 0;
  const averageRating = filteredData.length
    ? filteredData.reduce((sum, item) => sum + (item.rating || 0), 0) / filteredData.length
    : 0;
  const totalProducts = new Set(filteredData.map(item => item.product_id)).size;
  const topCategoryByRevenue = d3.rollups(
    filteredData,
    v => d3.sum(v, d => d.revenue),
    d => d.main_category
  ).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  // Prepare data for visualizations
  const allMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthlyRevenue = d3.rollups(
    filteredData,
    v => d3.sum(v, d => d.revenue || 0),
    d => d.month
  ).map(([month, revenue]) => ({ month, revenue }));
  const monthlyData = allMonths.map(month => {
    const found = monthlyRevenue.find(d => d.month === month);
    return { month, revenue: found ? found.revenue : 0 };
  });

  const categoryRevenue = d3.rollups(
    filteredData,
    v => d3.sum(v, d => d.revenue),
    d => d.main_category
  ).map(([category, revenue]) => ({ category, revenue }));
  const totalCategoryRevenue = d3.sum(categoryRevenue, d => d.revenue);

  const topProductsByRating = [...filteredData]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5)
    .map(item => ({ product_name: item.product_name, rating: item.rating }));

  const subcategoryQuantity = d3.rollups(
    filteredData,
    v => d3.sum(v, d => d.quantity_sold || 0),
    d => d.subcategory
  ).map(([subcategory, quantity]) => ({ subcategory, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  const revenueTrendData = monthlyData;

  const discountBins = d3.histogram()
    .value(d => d.discount_percentage)
    .domain([0, 100])
    .thresholds(d3.range(0, 100, 10))(filteredData)
    .map(bin => ({
      range: `${bin.x0}-${bin.x1}%`,
      count: bin.length,
    }));

  // Data for Average Rating by Category
  const avgRatingByCategory = d3.rollups(
    filteredData,
    v => d3.mean(v, d => d.rating || 0),
    d => d.main_category
  ).map(([category, avgRating]) => ({ category, avgRating }))
    .sort((a, b) => b.avgRating - a.avgRating);

  // Data for Treemap: Top 5 Subcategories by Revenue Contribution
  const subcategoryRevenueByCategory = d3.groups(
    filteredData,
    d => d.main_category,
    d => d.subcategory
  ).map(([main_category, subcategories]) => ({
    main_category,
    children: subcategories
      .map(([subcategory, items]) => ({
        subcategory,
        revenue: d3.sum(items, d => d.revenue),
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5), // Top 5 subcategories per main category
  }));

  const treemapData = {
    name: 'root',
    children: subcategoryRevenueByCategory.map(d => ({
      name: d.main_category,
      children: d.children.map(s => ({
        name: s.subcategory,
        value: s.revenue,
        main_category: d.main_category,
      })),
    })),
  };

  // Utility function to truncate long labels
  const truncateLabel = (text, maxLength) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };

  // Draw Monthly Revenue Histogram
  useEffect(() => {
    if (filteredData.length === 0) return;

    const svg = d3.select('#monthly-revenue')
      .attr('viewBox', `0 0 600 400`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    svg.selectAll('*').remove();

    const margin = { top: 30, right: 30, bottom: 80, left: 60 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(allMonths)
      .range([0, width])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(monthlyData, d => d.revenue)])
      .range([height, 0])
      .nice();

    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat(''))
      .selectAll('line')
      .attr('stroke', 'rgba(255, 255, 255, 0.1)');

    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', '#fff')
      .style('padding', '8px')
      .style('border-radius', '6px')
      .style('font-size', '12px');

    const bars = g.selectAll('.bar')
      .data(monthlyData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.month))
      .attr('y', d => y(d.revenue))
      .attr('width', x.bandwidth())
      .attr('height', d => height - y(d.revenue))
      .attr('fill', 'url(#bar-gradient-green)')
      .on('mouseover', function (event, d) {
        d3.select(this)
          .attr('filter', 'url(#glow)')
          .transition()
          .duration(200)
          .attr('y', y(d.revenue) - 5)
          .attr('height', height - y(d.revenue) + 5);
        tooltip.transition()
          .duration(200)
          .style('opacity', 0.9);
        tooltip.html(`Month: ${d.month}<br>Revenue: ₹${d.revenue.toLocaleString('en-IN')}`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function () {
        d3.select(this)
          .attr('filter', null)
          .transition()
          .duration(200)
          .attr('y', d => y(d.revenue))
          .attr('height', d => height - y(d.revenue));
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
      });

    const defs = svg.append('defs');
    const greenGradient = defs.append('linearGradient')
      .attr('id', 'bar-gradient-green')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    greenGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#66BB6A');
    greenGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#388E3C');

    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'blur');
    filter.append('feMerge')
      .append('feMergeNode')
      .attr('in', 'blur');
    filter.append('feMerge')
      .append('feMergeNode')
      .attr('in', 'SourceGraphic');

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .attr('text-anchor', 'end')
      .attr('fill', '#fff')
      .attr('font-size', '12px');

    g.append('text')
      .attr('x', width / 2)
      .attr('y', height + 70)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '14px')
      .text('Month');

    g.append('g')
      .call(d3.axisLeft(y).tickFormat(d => `₹${d / 1000}K`))
      .selectAll('text')
      .attr('fill', '#fff')
      .attr('font-size', '12px');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -50)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '14px')
      .text('Revenue');
  }, [filteredData]);

  // Draw Category Revenue Pie Chart
  useEffect(() => {
    if (filteredData.length === 0) return;

    const svg = d3.select('#category-revenue')
      .attr('viewBox', `0 0 600 400`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    svg.selectAll('*').remove();

    const width = 600;
    const height = 400;
    const radius = Math.min(width, height) / 2 - 60;

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const totalRevenue = d3.sum(categoryRevenue, d => d.revenue);
    const filteredCategoryRevenue = categoryRevenue.filter(d => (d.revenue / totalRevenue) * 100 >= 1);

    const pie = d3.pie()
      .value(d => d.revenue);

    const arc = d3.arc()
      .innerRadius(0)
      .outerRadius(radius);

    const labelArc = d3.arc()
      .innerRadius(radius)
      .outerRadius(radius + 20);

    const color = d3.scaleOrdinal()
      .domain(filteredCategoryRevenue.map(d => d.category))
      .range(d3.schemeSet2);

    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', '#fff')
      .style('padding', '8px')
      .style('border-radius', '6px')
      .style('font-size', '12px');

    const arcs = g.selectAll('.arc')
      .data(pie(filteredCategoryRevenue))
      .enter()
      .append('g')
      .attr('class', 'arc');

    arcs.append('path')
      .attr('d', arc)
      .attr('fill', d => color(d.data.category))
      .on('mouseover', function (event, d) {
        d3.select(this)
          .attr('filter', 'url(#glow)')
          .transition()
          .duration(200)
          .attr('d', d3.arc().innerRadius(0).outerRadius(radius + 10));
        tooltip.transition()
          .duration(200)
          .style('opacity', 0.9);
        tooltip.html(`Category: ${d.data.category}<br>Revenue: ₹${d.data.revenue.toLocaleString('en-IN')}`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function () {
        d3.select(this)
          .attr('filter', null)
          .transition()
          .duration(200)
          .attr('d', arc);
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
      });

    arcs.append('text')
      .attr('transform', d => `translate(${labelArc.centroid(d)})`)
      .attr('dy', '.35em')
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '12px')
      .text(d => `${((d.data.revenue / totalRevenue) * 100).toFixed(1)}%`);

    const legend = svg.append('g')
      .attr('transform', `translate(${width - 140}, 20)`);

    const legendItems = legend.selectAll('.legend-item')
      .data(filteredCategoryRevenue)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0, ${i * 20})`);

    legendItems.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', d => color(d.category));

    legendItems.append('text')
      .attr('x', 20)
      .attr('y', 12)
      .attr('font-size', '12px')
      .attr('fill', '#fff')
      .text(d => `${d.category} (${((d.revenue / totalRevenue) * 100).toFixed(1)}%)`);

    const defs = svg.append('defs');
    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'blur');
    filter.append('feMerge')
      .append('feMergeNode')
      .attr('in', 'blur');
    filter.append('feMerge')
      .append('feMergeNode')
      .attr('in', 'SourceGraphic');
  }, [filteredData]);

  // Draw Top Products by Rating Bar Chart
  useEffect(() => {
    if (filteredData.length === 0) return;

    const svg = d3.select('#top-products')
      .attr('viewBox', `0 0 600 400`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    svg.selectAll('*').remove();

    const margin = { top: 30, right: 30, bottom: 120, left: 60 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(topProductsByRating.map(d => d.product_name))
      .range([0, width])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, 5])
      .range([height, 0])
      .nice();

    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat(''))
      .selectAll('line')
      .attr('stroke', 'rgba(255, 255, 255, 0.1)');

    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', '#fff')
      .style('padding', '8px')
      .style('border-radius', '6px')
      .style('font-size', '12px');

    const bars = g.selectAll('.bar')
      .data(topProductsByRating)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.product_name))
      .attr('y', d => y(d.rating))
      .attr('width', x.bandwidth())
      .attr('height', d => height - y(d.rating))
      .attr('fill', 'url(#bar-gradient-amber)')
      .on('mouseover', function (event, d) {
        d3.select(this)
          .attr('filter', 'url(#glow)')
          .transition()
          .duration(200)
          .attr('y', y(d.rating) - 5)
          .attr('height', height - y(d.rating) + 5);
        tooltip.transition()
          .duration(200)
          .style('opacity', 0.9);
        tooltip.html(`Product: ${d.product_name}<br>Rating: ${d.rating.toFixed(1)}`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function () {
        d3.select(this)
          .attr('filter', null)
          .transition()
          .duration(200)
          .attr('y', d => y(d.rating))
          .attr('height', d => height - y(d.rating));
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
      });

    const defs = svg.append('defs');
    const amberGradient = defs.append('linearGradient')
      .attr('id', 'bar-gradient-amber')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    amberGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#FFD54F');
    amberGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#FFB300');

    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'blur');
    filter.append('feMerge')
      .append('feMergeNode')
      .attr('in', 'blur');
    filter.append('feMerge')
      .append('feMergeNode')
      .attr('in', 'SourceGraphic');

    const yDomain = y.domain();
    const yRange = yDomain[1] - yDomain[0];
    g.selectAll('.label')
      .data(topProductsByRating)
      .enter()
      .append('text')
      .attr('class', 'label')
      .filter(d => (d.rating / yRange) > 0.1)
      .attr('x', d => x(d.product_name) + x.bandwidth() / 2)
      .attr('y', d => y(d.rating) - 10)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#fff')
      .text(d => d.rating.toFixed(1));

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .text(d => truncateLabel(d, 15))
      .attr('transform', 'rotate(-60)')
      .attr('text-anchor', 'end')
      .attr('fill', '#fff')
      .attr('font-size', '10px');

    g.append('text')
      .attr('x', width / 2)
      .attr('y', height + 90)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '14px')
      .text('Product Name');

    g.append('g')
      .call(d3.axisLeft(y))
      .selectAll('text')
      .attr('fill', '#fff')
      .attr('font-size', '12px');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -40)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '14px')
      .text('Rating');
  }, [filteredData]);

  // Draw Quantity Sold by Subcategory Bar Chart
  useEffect(() => {
    if (filteredData.length === 0) return;

    const svg = d3.select('#subcategory-quantity')
      .attr('viewBox', `0 0 600 400`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    svg.selectAll('*').remove();

    const margin = { top: 30, right: 30, bottom: 120, left: 60 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(subcategoryQuantity.map(d => d.subcategory))
      .range([0, width])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(subcategoryQuantity, d => d.quantity)])
      .range([height, 0])
      .nice();

    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat(''))
      .selectAll('line')
      .attr('stroke', 'rgba(255, 255, 255, 0.1)');

    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', '#fff')
      .style('padding', '8px')
      .style('border-radius', '6px')
      .style('font-size', '12px');

    const bars = g.selectAll('.bar')
      .data(subcategoryQuantity)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.subcategory))
      .attr('y', d => y(d.quantity))
      .attr('width', x.bandwidth())
      .attr('height', d => height - y(d.quantity))
      .attr('fill', 'url(#bar-gradient-red)')
      .on('mouseover', function (event, d) {
        d3.select(this)
          .attr('filter', 'url(#glow)')
          .transition()
          .duration(200)
          .attr('y', y(d.quantity) - 5)
          .attr('height', height - y(d.quantity) + 5);
        tooltip.transition()
          .duration(200)
          .style('opacity', 0.9);
        tooltip.html(`Subcategory: ${d.subcategory}<br>Quantity: ${d.quantity}`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function () {
        d3.select(this)
          .attr('filter', null)
          .transition()
          .duration(200)
          .attr('y', d => y(d.quantity))
          .attr('height', d => height - y(d.quantity));
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
      });

    const defs = svg.append('defs');
    const redGradient = defs.append('linearGradient')
      .attr('id', 'bar-gradient-red')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    redGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#FF7043');
    redGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#D84315');

    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'blur');
    filter.append('feMerge')
      .append('feMergeNode')
      .attr('in', 'blur');
    filter.append('feMerge')
      .append('feMergeNode')
      .attr('in', 'SourceGraphic');

    const yDomain = y.domain();
    const yRange = yDomain[1] - yDomain[0];
    g.selectAll('.label')
      .data(subcategoryQuantity)
      .enter()
      .append('text')
      .attr('class', 'label')
      .filter(d => (d.quantity / yRange) > 0.1)
      .attr('x', d => x(d.subcategory) + x.bandwidth() / 2)
      .attr('y', d => y(d.quantity) - 10)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#fff')
      .text(d => d.quantity);

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .text(d => truncateLabel(d, 15))
      .attr('transform', 'rotate(-60)')
      .attr('text-anchor', 'end')
      .attr('fill', '#fff')
      .attr('font-size', '10px');

    g.append('text')
      .attr('x', width / 2)
      .attr('y', height + 90)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '14px')
      .text('Subcategory');

    g.append('g')
      .call(d3.axisLeft(y))
      .selectAll('text')
      .attr('fill', '#fff')
      .attr('font-size', '12px');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -40)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '14px')
      .text('Quantity Sold');
  }, [filteredData]);

  // Draw Revenue Trend Line Chart
  useEffect(() => {
    if (filteredData.length === 0) return;

    const svg = d3.select('#revenue-trend')
      .attr('viewBox', `0 0 600 400`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    svg.selectAll('*').remove();

    const margin = { top: 30, right: 30, bottom: 80, left: 60 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(allMonths)
      .range([0, width])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(revenueTrendData, d => d.revenue)])
      .range([height, 0])
      .nice();

    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat(''))
      .selectAll('line')
      .attr('stroke', 'rgba(255, 255, 255, 0.1)');

    const line = d3.line()
      .x(d => x(d.month) + x.bandwidth() / 2)
      .y(d => y(d.revenue))
      .curve(d3.curveMonotoneX);

    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', '#fff')
      .style('padding', '8px')
      .style('border-radius', '6px')
      .style('font-size', '12px');

    g.append('path')
      .datum(revenueTrendData)
      .attr('fill', 'none')
      .attr('stroke', 'url(#line-gradient-blue)')
      .attr('stroke-width', 3)
      .attr('d', line);

    const defs = svg.append('defs');
    const blueGradient = defs.append('linearGradient')
      .attr('id', 'line-gradient-blue')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');
    blueGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#42A5F5');
    blueGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#1976D2');

    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'blur');
    filter.append('feMerge')
      .append('feMergeNode')
      .attr('in', 'blur');
    filter.append('feMerge')
      .append('feMergeNode')
      .attr('in', 'SourceGraphic');

    g.selectAll('.dot')
      .data(revenueTrendData)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', d => x(d.month) + x.bandwidth() / 2)
      .attr('cy', d => y(d.revenue))
      .attr('r', 5)
      .attr('fill', '#1976D2')
      .on('mouseover', function (event, d) {
        d3.select(this)
          .attr('r', 7)
          .attr('fill', '#42A5F5')
          .attr('filter', 'url(#glow)');
        tooltip.transition()
          .duration(200)
          .style('opacity', 0.9);
        tooltip.html(`Month: ${d.month}<br>Revenue: ₹${d.revenue.toLocaleString('en-IN')}`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function () {
        d3.select(this)
          .attr('r', 5)
          .attr('fill', '#1976D2')
          .attr('filter', null);
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
      });

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .attr('text-anchor', 'end')
      .attr('fill', '#fff')
      .attr('font-size', '12px');

    g.append('text')
      .attr('x', width / 2)
      .attr('y', height + 70)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '14px')
      .text('Month');

    g.append('g')
      .call(d3.axisLeft(y).tickFormat(d => `₹${d / 1000}K`))
      .selectAll('text')
      .attr('fill', '#fff')
      .attr('font-size', '12px');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -50)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '14px')
      .text('Revenue');
  }, [filteredData]);

  // Draw Discount Distribution Histogram
  useEffect(() => {
    if (filteredData.length === 0) return;

    const svg = d3.select('#discount-distribution')
      .attr('viewBox', `0 0 600 400`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    svg.selectAll('*').remove();

    const margin = { top: 30, right: 30, bottom: 80, left: 60 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(discountBins.map(d => d.range))
      .range([0, width])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(discountBins, d => d.count)])
      .range([height, 0])
      .nice();

    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat(''))
      .selectAll('line')
      .attr('stroke', 'rgba(255, 255, 255, 0.1)');

    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', '#fff')
      .style('padding', '8px')
      .style('border-radius', '6px')
      .style('font-size', '12px');

    const bars = g.selectAll('.bar')
      .data(discountBins)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.range))
      .attr('y', d => y(d.count))
      .attr('width', x.bandwidth())
      .attr('height', d => height - y(d.count))
      .attr('fill', 'url(#bar-gradient-purple)')
      .on('mouseover', function (event, d) {
        d3.select(this)
          .attr('filter', 'url(#glow)')
          .transition()
          .duration(200)
          .attr('y', y(d.count) - 5)
          .attr('height', height - y(d.count) + 5);
        tooltip.transition()
          .duration(200)
          .style('opacity', 0.9);
        tooltip.html(`Range: ${d.range}<br>Count: ${d.count}`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function () {
        d3.select(this)
          .attr('filter', null)
          .transition()
          .duration(200)
          .attr('y', d => y(d.count))
          .attr('height', d => height - y(d.count));
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
      });

    const defs = svg.append('defs');
    const purpleGradient = defs.append('linearGradient')
      .attr('id', 'bar-gradient-purple')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    purpleGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#AB47BC');
    purpleGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#7B1FA2');

    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'blur');
    filter.append('feMerge')
      .append('feMergeNode')
      .attr('in', 'blur');
    filter.append('feMerge')
      .append('feMergeNode')
      .attr('in', 'SourceGraphic');

    g.selectAll('.label')
      .data(discountBins)
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('x', d => x(d.range) + x.bandwidth() / 2)
      .attr('y', d => y(d.count) - 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#fff')
      .text(d => d.count);

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .attr('text-anchor', 'end')
      .attr('fill', '#fff')
      .attr('font-size', '12px');

    g.append('text')
      .attr('x', width / 2)
      .attr('y', height + 70)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '14px')
      .text('Discount Range (%)');

    g.append('g')
      .call(d3.axisLeft(y))
      .selectAll('text')
      .attr('fill', '#fff')
      .attr('font-size', '12px');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -40)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '14px')
      .text('Number of Products');
  }, [filteredData]);

  // Draw Average Rating by Category Bar Chart
  useEffect(() => {
    if (filteredData.length === 0) return;

    const svg = d3.select('#avg-rating-category')
      .attr('viewBox', `0 0 600 400`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    svg.selectAll('*').remove();

    const margin = { top: 30, right: 30, bottom: 120, left: 60 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(avgRatingByCategory.map(d => d.category))
      .range([0, width])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, 5])
      .range([height, 0])
      .nice();

    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat(''))
      .selectAll('line')
      .attr('stroke', 'rgba(255, 255, 255, 0.1)');

    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', '#fff')
      .style('padding', '8px')
      .style('border-radius', '6px')
      .style('font-size', '12px');

    const bars = g.selectAll('.bar')
      .data(avgRatingByCategory)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.category))
      .attr('y', d => y(d.avgRating))
      .attr('width', x.bandwidth())
      .attr('height', d => height - y(d.avgRating))
      .attr('fill', 'url(#bar-gradient-blue)')
      .on('mouseover', function (event, d) {
        d3.select(this)
          .attr('filter', 'url(#glow)')
          .transition()
          .duration(200)
          .attr('y', y(d.avgRating) - 5)
          .attr('height', height - y(d.avgRating) + 5);
        tooltip.transition()
          .duration(200)
          .style('opacity', 0.9);
        tooltip.html(`Category: ${d.category}<br>Avg Rating: ${d.avgRating.toFixed(2)}`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function () {
        d3.select(this)
          .attr('filter', null)
          .transition()
          .duration(200)
          .attr('y', d => y(d.avgRating))
          .attr('height', d => height - y(d.avgRating));
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
      });

    const defs = svg.append('defs');
    const blueGradient = defs.append('linearGradient')
      .attr('id', 'bar-gradient-blue')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    blueGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#42A5F5');
    blueGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#1976D2');

    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'blur');
    filter.append('feMerge')
      .append('feMergeNode')
      .attr('in', 'blur');
    filter.append('feMerge')
      .append('feMergeNode')
      .attr('in', 'SourceGraphic');

    const yDomain = y.domain();
    const yRange = yDomain[1] - yDomain[0];
    g.selectAll('.label')
      .data(avgRatingByCategory)
      .enter()
      .append('text')
      .attr('class', 'label')
      .filter(d => (d.avgRating / yRange) > 0.1)
      .attr('x', d => x(d.category) + x.bandwidth() / 2)
      .attr('y', d => y(d.avgRating) - 10)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#fff')
      .text(d => d.avgRating.toFixed(2));

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .text(d => truncateLabel(d, 15))
      .attr('transform', 'rotate(-60)')
      .attr('text-anchor', 'end')
      .attr('fill', '#fff')
      .attr('font-size', '10px');

    g.append('text')
      .attr('x', width / 2)
      .attr('y', height + 90)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '14px')
      .text('Category');

    g.append('g')
      .call(d3.axisLeft(y))
      .selectAll('text')
      .attr('fill', '#fff')
      .attr('font-size', '12px');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -40)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '14px')
      .text('Average Rating');
  }, [filteredData]);

        // Chart: Top 5 Subcategories by Revenue Contribution (Horizontal Bar Chart)
  useEffect(() => {
    if (filteredData.length === 0) return;

    // Data preparation inside the useEffect to ensure scope and reactivity
    const subcategoryRevenueOverall = d3.rollups(
      filteredData,
      v => d3.sum(v, d => d.revenue),
      d => d.subcategory,
      d => d.main_category
    ).map(([subcategory, mainCategories]) => ({
      subcategory,
      revenue: d3.sum(mainCategories, mc => mc[1]),
      main_category: mainCategories[0][0], // Assumes a subcategory belongs to one main category
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5); // Take top 5 subcategories overall

    const svg = d3.select('#subcategory-revenue-treemap')
      .attr('viewBox', `0 0 600 450`) // Increased height to accommodate legend
      .attr('preserveAspectRatio', 'xMidYMid meet');

    svg.selectAll('*').remove();

    const margin = { top: 30, right: 30, bottom: 100, left: 150 }; // Increased bottom margin for legend
    const width = 600 - margin.left - margin.right;
    const height = 450 - margin.top - margin.bottom; // Adjusted total height

    const chartHeight = height - 60; // Reserve 60px for the legend and X-axis label

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Color scale for subcategories (each bar gets a unique color)
    const color = d3.scaleOrdinal()
      .domain(subcategoryRevenueOverall.map(d => d.subcategory))
      .range(d3.schemeTableau10);

    // Y scale for subcategories
    const y = d3.scaleBand()
      .domain(subcategoryRevenueOverall.map(d => d.subcategory))
      .range([0, chartHeight]) // Use chartHeight instead of height
      .padding(0.2);

    // X scale for revenue
    const x = d3.scaleLinear()
      .domain([0, d3.max(subcategoryRevenueOverall, d => d.revenue)])
      .range([0, width])
      .nice();

    // Add grid lines
    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisTop(x)
        .tickSize(-chartHeight) // Use chartHeight for grid lines
        .tickFormat(''))
      .selectAll('line')
      .attr('stroke', 'rgba(255, 255, 255, 0.1)');

    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', '#fff')
      .style('padding', '8px')
      .style('border-radius', '6px')
      .style('font-size', '12px');

    // Draw bars
    const bars = g.selectAll('.bar')
      .data(subcategoryRevenueOverall)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('y', d => y(d.subcategory))
      .attr('x', 0)
      .attr('width', d => x(d.revenue))
      .attr('height', y.bandwidth())
      .attr('fill', d => color(d.subcategory))
      .on('mouseover', function (event, d) {
        d3.select(this)
          .attr('filter', 'url(#glow)')
          .transition()
          .duration(200)
          .attr('width', x(d.revenue) + 5);
        tooltip.transition()
          .duration(200)
          .style('opacity', 0.9);
        tooltip.html(`Main Category: ${d.main_category}<br>Subcategory: ${d.subcategory}<br>Revenue: ₹${d.revenue.toLocaleString('en-IN')}`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function () {
        d3.select(this)
          .attr('filter', null)
          .transition()
          .duration(200)
          .attr('width', d => x(d.revenue));
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
      });

    // Add revenue labels on the bars
    g.selectAll('.label')
      .data(subcategoryRevenueOverall)
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('x', d => x(d.revenue) + 5)
      .attr('y', d => y(d.subcategory) + y.bandwidth() / 2)
      .attr('dy', '.35em')
      .attr('text-anchor', 'start')
      .attr('font-size', '12px')
      .attr('fill', '#fff')
      .text(d => `₹${(d.revenue / 1000).toFixed(1)}K`);

    // Define glow effect
    const defs = svg.append('defs');
    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'blur');
    filter.append('feMerge')
      .append('feMergeNode')
      .attr('in', 'blur');
    filter.append('feMerge')
      .append('feMergeNode')
      .attr('in', 'SourceGraphic');

    // Y axis (subcategories)
    g.append('g')
      .call(d3.axisLeft(y))
      .selectAll('text')
      .attr('fill', '#fff')
      .attr('font-size', '12px')
      .text(d => truncateLabel(d, 20));

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -chartHeight / 2)
      .attr('y', -margin.left + 20)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '14px')
      .text('Subcategory');

    // X axis (revenue)
    g.append('g')
      .attr('transform', `translate(0,${chartHeight})`) // Use chartHeight for X-axis position
      .call(d3.axisBottom(x).tickFormat(d => `₹${d / 1000}K`))
      .selectAll('text')
      .attr('fill', '#fff')
      .attr('font-size', '12px');

    g.append('text')
      .attr('x', width / 2)
      .attr('y', chartHeight + 40) // Adjusted to use chartHeight
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '14px')
      .text('Revenue');

    // Add a legend for subcategories at the bottom
    const legendItemsPerRow = 3;
    const legendItemWidth = 150;
    const legendItemHeight = 20;
    const legendRows = Math.ceil(subcategoryRevenueOverall.length / legendItemsPerRow);
    const legendHeight = legendRows * legendItemHeight;

    const legend = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top + chartHeight + 60})`); // Position below the chart

    const legendItems = legend.selectAll('.legend-item')
      .data(subcategoryRevenueOverall)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => {
        const row = Math.floor(i / legendItemsPerRow);
        const col = i % legendItemsPerRow;
        return `translate(${col * legendItemWidth}, ${row * legendItemHeight})`;
      });

    legendItems.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', d => color(d.subcategory));

    legendItems.append('text')
      .attr('x', 20)
      .attr('y', 12)
      .attr('font-size', '12px')
      .attr('fill', '#fff')
      .text(d => truncateLabel(d.subcategory, 15));
  }, [filteredData]);

  
  // Filter options
  const mainCategories = ['All', ...new Set(data.map(item => item.main_category).filter(Boolean))];
  const subcategories = ['All', ...new Set(data.map(item => item.subcategory).filter(Boolean))];

  return (
    <div className="App">
      <div className="dashboard-container">
        {/* Sidebar for KPIs */}
        <div className="sidebar">
          <h2>Key Metrics 📊</h2>
          <div className="kpi">
            <h3>Total Revenue 💰</h3>
            <p>₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
          </div>
          <div className="kpi">
            <h3>Total Quantity 📦</h3>
            <p>{totalQuantity.toLocaleString()}</p>
          </div>
          <div className="kpi">
            <h3>Total Transactions 🛒</h3>
            <p>{totalTransactions.toLocaleString()}</p>
          </div>
          <div className="kpi">
            <h3>Average Discount 🎁</h3>
            <p>{averageDiscount.toFixed(2)}%</p>
          </div>
          <div className="kpi">
            <h3>Average Rating ⭐</h3>
            <p>{averageRating.toFixed(2)}</p>
          </div>
          <div className="kpi">
            <h3>Total Products 🛍️</h3>
            <p>{totalProducts.toLocaleString()}</p>
          </div>
          <div className="kpi">
            <h3>Top Category 🏆</h3>
            <p>{topCategoryByRevenue}</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          <h1>Datavista Pro: Amazon Sales Dashboard 📈</h1>

          {error && <div className="error">{error}</div>}

          {/* Filters */}
          <div className="filters">
            <div>
              <label>Main Category: </label>
              <select onChange={e => setMainCategory(e.target.value)} value={mainCategory}>
                {mainCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Subcategory: </label>
              <select onChange={e => setSubcategory(e.target.value)} value={subcategory}>
                {subcategories.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Rating Range: {ratingRange[0]} - {ratingRange[1]}</label>
              <div className="range-inputs">
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={ratingRange[0]}
                  onChange={e => setRatingRange([parseFloat(e.target.value), ratingRange[1]])}
                />
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={ratingRange[1]}
                  onChange={e => setRatingRange([ratingRange[0], parseFloat(e.target.value)])}
                />
              </div>
            </div>
            <div>
              <label>Discount Range: {discountRange[0]}% - {discountRange[1]}%</label>
              <div className="range-inputs">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={discountRange[0]}
                  onChange={e => setDiscountRange([parseInt(e.target.value), discountRange[1]])}
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={discountRange[1]}
                  onChange={e => setDiscountRange([discountRange[0], parseInt(e.target.value)])}
                />
              </div>
            </div>
          </div>

          {/* Visualizations - First Row */}
          <div className="visualizations-row">
            <div className="chart">
              <h2>Monthly Revenue 📅💸</h2>
              {filteredData.length === 0 ? (
                <p className="no-data">No data available to display the chart. 😢</p>
              ) : (
                <svg id="monthly-revenue"></svg>
              )}
            </div>
            <div className="chart">
              <h2>Revenue by Category 🥧💰</h2>
              {filteredData.length === 0 ? (
                <p className="no-data">No data available to display the chart. 😢</p>
              ) : (
                <svg id="category-revenue"></svg>
              )}
            </div>
          </div>

          {/* Visualizations - Second Row */}
          <div className="visualizations-row">
            <div className="chart">
              <h2>Top 5 Products by Rating 🌟</h2>
              {filteredData.length === 0 ? (
                <p className="no-data">No data available to display the chart. 😢</p>
              ) : (
                <svg id="top-products"></svg>
              )}
            </div>
            <div className="chart">
              <h2>Quantity Sold by Subcategory 📦📊</h2>
              {filteredData.length === 0 ? (
                <p className="no-data">No data available to display the chart. 😢</p>
              ) : (
                <svg id="subcategory-quantity"></svg>
              )}
            </div>
          </div>

          {/* Visualizations - Third Row */}
          <div className="visualizations-row">
            <div className="chart">
              <h2>Revenue Trend Over Months 📈</h2>
              {filteredData.length === 0 ? (
                <p className="no-data">No data available to display the chart. 😢</p>
              ) : (
                <svg id="revenue-trend"></svg>
              )}
            </div>
            <div className="chart">
              <h2>Discount Distribution 🎁📊</h2>
              {filteredData.length === 0 ? (
                <p className="no-data">No data available to display the chart. 😢</p>
              ) : (
                <svg id="discount-distribution"></svg>
              )}
            </div>
          </div>

          {/* Visualizations - Fourth Row */}
          <div className="visualizations-row">
            <div className="chart">
              <h2>Average Rating by Category ⭐📊</h2>
              {filteredData.length === 0 ? (
                <p className="no-data">No data available to display the chart. 😢</p>
              ) : (
                <svg id="avg-rating-category"></svg>
              )}
            </div>
            <div className="chart">
              <h2>Top 5 Subcategories by Revenue Contribution 🌳💸</h2>
              {filteredData.length === 0 ? (
                <p className="no-data">No data available to display the chart. 😢</p>
              ) : (
                <svg id="subcategory-revenue-treemap"></svg>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;