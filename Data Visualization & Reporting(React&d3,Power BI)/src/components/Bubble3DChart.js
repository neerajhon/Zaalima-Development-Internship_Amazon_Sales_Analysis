import React, { useRef, useEffect } from "react";
import * as d3 from "d3";

const BubbleChart = ({ data }) => {
 const ref = useRef();

 useEffect(() => {
 if (!data?.length) return;

 const svg = d3.select(ref.current);
 svg.selectAll("*").remove();

 const width = 800,
 height = 400;
 svg.attr("width", width).attr("height", height);

 const parsedData = data.map((d) => ({
 rating: parseFloat(d.product_star_rating || 0) || 0,
 price: parseFloat(d.product_price?.replace(/[^0-9.]/g, "") || 0) || 0,
 reviews: parseInt(d.total_reviews || "0") || 0,
 })).filter(
 (d) =>
 typeof d.price === "number" &&
 d.price > 0 &&
 typeof d.rating === "number" &&
 d.rating > 0 &&
 typeof d.reviews === "number" &&
 d.reviews > 0
 );

 const x = d3
 .scaleLinear()
 .domain([0, d3.max(parsedData, (d) => d.price)])
 .range([50, width - 50]);

 const y = d3.scaleLinear().domain([0, 5]).range([height - 50, 50]);

 const r = d3
 .scaleSqrt()
 .domain([0, d3.max(parsedData, (d) => d.reviews)])
 .range([3, 20]);

 svg
 .selectAll("circle")
 .data(parsedData)
 .enter()
 .append("circle")
 .attr("cx", (d) => x(d.price))
 .attr("cy", (d) => y(d.rating))
 .attr("r", (d) => r(d.reviews))
 .attr("fill", "skyblue")
 .attr("opacity", 0.6);

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

export default BubbleChart;
