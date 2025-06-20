import React, { useRef, useEffect } from "react";
import * as d3 from "d3";

const PieChart = ({ data }) => {
  const ref = useRef();

  useEffect(() => {
    if (!data.length) return;

    // 1. Extract and Flatten Categories
    const flattenedData = data.reduce((acc, item) => {
      const categories = item.category ? item.category.split("|") : ["Unknown"];
      categories.forEach(category => {
        acc.push({ category: category.trim() }); // Trim whitespace
      });
      return acc;
    }, []);

    console.log("Flattened Data:", flattenedData);

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const width = 400, height = 400, radius = Math.min(width, height) / 2;
    svg.attr("width", width).attr("height", height);

    const g = svg.append("g").attr("transform", `translate(${width / 2}, ${height / 2})`);

    // 2. Rollup on Flattened Data
    const categoryCounts = d3.rollups(
      flattenedData,
      v => v.length,
      d => d.category
    );

    console.log("Category Counts:", categoryCounts);

    const pie = d3.pie().value(d => d[1]);
    const pieData = pie(categoryCounts);

    console.log("Pie Data:", pieData);

    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    // 3. Color Scale - Ensure enough distinct colors
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    g.selectAll("path")
      .data(pieData)
      .enter()
      .append("path")
      .attr("d", arc)
      .attr("fill", d => color(d.data[0]))
      .append("title")
      .text(d => `${d.data[0]}: ${d.data[1]}`);

  }, [data]);

  return <svg ref={ref}></svg>;
};

export default PieChart;
