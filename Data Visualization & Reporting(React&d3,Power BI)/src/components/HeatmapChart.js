import React, { useRef, useEffect } from "react";
import * as d3 from "d3";

const Heatmap = ({ data }) => {
  const ref = useRef();

  useEffect(() => {
    if (!data.length) return;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();
    const width = 800, height = 400;

    const ratings = [1, 2, 3, 4, 5];
    const categories = [...new Set(data.map(d => d.category || "Unknown"))];

    const heatData = d3.rollups(
      data,
      v => v.length,
      d => d.category || "Unknown",
      d => Math.round(parseFloat(d.product_star_rating)) || 0
    ).flatMap(([category, ratingCounts]) =>
      ratings.map(rating => ({
        category,
        rating,
        count: ratingCounts.find(([r]) => r === rating)?.[1] || 0
      }))
    );

    const x = d3.scaleBand().domain(ratings).range([100, width - 50]).padding(0.05);
    const y = d3.scaleBand().domain(categories).range([50, height - 50]).padding(0.05);
    const color = d3.scaleSequential(d3.interpolateOranges)
      .domain([0, d3.max(heatData, d => d.count)]);

    svg.attr("width", width).attr("height", height);

    svg.selectAll("rect")
      .data(heatData)
      .enter()
      .append("rect")
      .attr("x", d => x(d.rating))
      .attr("y", d => y(d.category))
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("fill", d => color(d.count));

    svg.selectAll("text")
      .data(heatData)
      .enter()
      .append("text")
      .attr("x", d => x(d.rating) + x.bandwidth() / 2)
      .attr("y", d => y(d.category) + y.bandwidth() / 2)
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "central")
      .attr("fill", "black")
      .text(d => d.count);

    svg.append("g")
      .attr("transform", `translate(0, ${height - 50})`)
      .call(d3.axisBottom(x));

    svg.append("g")
      .attr("transform", `translate(100, 0)`)
      .call(d3.axisLeft(y));

  }, [data]);

  return <svg ref={ref}></svg>;
};

export default Heatmap;
