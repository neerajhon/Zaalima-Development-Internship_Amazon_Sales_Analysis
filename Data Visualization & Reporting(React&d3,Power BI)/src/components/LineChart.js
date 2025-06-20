import React, { useRef, useEffect } from "react";
import * as d3 from "d3";

const LineChart = ({ data }) => {
 const ref = useRef();

 useEffect(() => {
 if (!data?.length) return;

 const svg = d3.select(ref.current);
 svg.selectAll("*").remove();

 const width = 800,
 height = 400;
 svg.attr("width", width).attr("height", height);

 const cleanedData = data
 .map((d, i) => ({
 index: i,
 price:
 parseFloat(d.product_price?.replace(/[^0-9.]/g, "") || 0) || 0,
 }))
 .filter(
 (d) =>
 typeof d.price === "number" &&
 !isNaN(d.price) &&
 d.price > 0
 );

 const x = d3
 .scaleLinear()
 .domain([0, cleanedData.length])
 .range([50, width - 50]);

 const y = d3
 .scaleLinear()
 .domain([0, d3.max(cleanedData, (d) => d.price)])
 .range([height - 50, 50]);

 const line = d3
 .line()
 .x((d) => x(d.index))
 .y((d) => y(d.price));

 svg
 .append("path")
 .datum(cleanedData)
 .attr("fill", "none")
 .attr("stroke", "steelblue")
 .attr("stroke-width", 2)
 .attr("d", line);

 svg
 .append("g")
 .attr("transform", `translate(0, ${height - 50})`)
 .call(d3.axisBottom(x));

 svg
 .append("g")
 .attr("transform", `translate(50, 0)`)
 .call(d3.axisLeft(y));
 }, [data]);

 return <svg ref={ref}></svg>;
};

export default LineChart;
