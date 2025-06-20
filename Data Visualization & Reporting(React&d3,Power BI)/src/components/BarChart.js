import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { processDataForBarChart } from '../utils/dataProcessor';

const BarChart = ({ data }) => {
  const svgRef = useRef();

  useEffect(() => {
    const processedData = processDataForBarChart(data);
    const svg = d3.select(svgRef.current);
    const width = 600;
    const height = 400;
    const margin = { top: 20, right: 30, bottom: 100, left: 40 };

    svg.attr('width', width).attr('height', height);

    const x = d3
      .scaleBand()
      .domain(processedData.map(d => d.category))
      .range([margin.left, width - margin.right])
      .padding(0.1);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(processedData, d => d.avgRating)]).nice()
      .range([height - margin.bottom, margin.top]);

    svg.selectAll('*').remove(); // Clear previous render

    svg
      .append('g')
      .selectAll('rect')
      .data(processedData)
      .join('rect')
      .attr('x', d => x(d.category))
      .attr('y', d => y(d.avgRating))
      .attr('width', x.bandwidth())
      .attr('height', d => y(0) - y(d.avgRating))
      .attr('fill', 'steelblue')
      .on('mouseover', function (event, d) {
        d3.select(this).attr('fill', 'orange');
        svg
          .append('text')
          .attr('id', 'tooltip')
          .attr('x', x(d.category) + x.bandwidth() / 2)
          .attr('y', y(d.avgRating) - 10)
          .attr('text-anchor', 'middle')
          .text(Rating: ${d.avgRating.toFixed(2)});
      })
      .on('mouseout', function () {
        d3.select(this).attr('fill', 'steelblue');
        svg.select('#tooltip').remove();
      });

    svg
      .append('g')
      .attr('transform', translate(0,${height - margin.bottom}))
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

    svg
      .append('g')
      .attr('transform', translate(${margin.left},0))
      .call(d3.axisLeft(y));
  }, [data]);

  return <svg ref={svgRef}></svg>;
};

export default BarChart;