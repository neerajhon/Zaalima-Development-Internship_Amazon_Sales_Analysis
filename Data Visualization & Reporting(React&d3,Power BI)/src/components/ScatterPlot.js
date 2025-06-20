import React, { useRef, useEffect } from "react";
import * as d3 from "d3";

const ScatterPlot = ({ data }) => {
 const ref = useRef();

 useEffect(() => {
 if (!data?.length) return;

 const svg = d3.select(ref.current);
 svg.selectAll("*").remove();

 const width = 800,
 height = 400;
 svg.attr("width", width).attr("height", height);

 const cleanedData = data
 .map((d) => ({
 rating: parseFloat(d.product_star_rating || 0) || 0,
 price:
 parseFloat(d.product_price?.replace(/[^0-9.]/g, "") || 0) || 0,
 }))
 .filter(
 (d) =>
 typeof d.price === "number" &&
 !isNaN(d.price) &&
 d.price > 0 &&
 typeof d.rating === "number" &&
 !isNaN(d.rating) &&
 d.rating > 0
 );

 const x = d3
 .scaleLinear()
 .domain([0, d3.max(cleanedData, (d) => d.price)])
 .range([50, width - 50]);

 const y = d3.scaleLinear().domain([0, 5]).range([height - 50, 50]);

 svg
 .selectAll("circle")
 .data(cleanedData)
 .enter()
 .append("circle")
 .attr("cx", (d) => x(d.price))
 .attr("cy", (d) => y(d.rating))
 .attr("r", 4)
 .attr("fill", "orange")
 .attr("opacity", 0.7);

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

export default ScatterPlot;
