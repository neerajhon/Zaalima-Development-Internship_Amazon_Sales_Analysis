import React, { useRef, useEffect } from "react";
import * as d3 from "d3";

const Treemap = ({ data }) => {
  const ref = useRef();

  useEffect(() => {
    if (!data.length) return;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();
    const width = 800, height = 400;

    const categoryData = d3.rollups(
      data,
      v => v.length,
      d => d.category || "Unknown"
    ).map(([name, value]) => ({ name, value }));

    const root = d3.hierarchy({ children: categoryData }).sum(d => d.value);

    d3.treemap()
      .size([width, height])
      .padding(1)
      (root);

    const color = d3.scaleOrdinal(d3.schemeTableau10);

    const nodes = svg
      .attr("width", width)
      .attr("height", height)
      .selectAll("g")
      .data(root.leaves())
      .enter()
      .append("g")
      .attr("transform", d => `translate(${d.x0}, ${d.y0})`);

    nodes.append("rect")
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => d.y1 - d.y0)
      .attr("fill", d => color(d.data.name));

    nodes.append("title").text(d => `${d.data.name}: ${d.data.value}`);

    nodes.append("text")
      .attr("x", 5)
      .attr("y", 20)
      .text(d => d.data.name)
      .attr("fill", "#fff")
      .style("font-size", "12px");

  }, [data]);

  return <svg ref={ref}></svg>;
};

export default Treemap;
