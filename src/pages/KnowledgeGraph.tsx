import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import * as d3 from "d3";
import { knowledgeGraphNodes, knowledgeGraphLinks, type GraphNode, type GraphLink } from "@/data/mockData";

const riskColorMap: Record<string, string> = {
  excellent: "hsl(150,60%,50%)",
  good: "hsl(170,55%,45%)",
  moderate: "hsl(45,85%,55%)",
  risk: "hsl(25,90%,55%)",
  critical: "hsl(0,72%,55%)",
};

const KnowledgeGraph = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = 500;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const g = svg.append("g");

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);

    const simulation = d3.forceSimulation<any>(knowledgeGraphNodes.map(n => ({ ...n })))
      .force("link", d3.forceLink<any, any>(knowledgeGraphLinks.map(l => ({ ...l }))).id((d: any) => d.id).distance(100).strength((l: any) => l.strength * 0.5))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(35));

    const links = g.selectAll("line")
      .data(simulation.force<d3.ForceLink<any, any>>("link")!.links())
      .join("line")
      .attr("stroke", "hsl(222,30%,22%)")
      .attr("stroke-width", (d: any) => d.strength * 2)
      .attr("stroke-opacity", 0.6);

    const nodes = g.selectAll("g.node")
      .data(simulation.nodes())
      .join("g")
      .attr("class", "node")
      .style("cursor", "pointer")
      .call(d3.drag<any, any>()
        .on("start", (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on("end", (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    // Glow filter
    const defs = svg.append("defs");
    const filter = defs.append("filter").attr("id", "glow");
    filter.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    nodes.append("circle")
      .attr("r", 0)
      .attr("fill", (d: any) => riskColorMap[d.risk])
      .attr("stroke", (d: any) => riskColorMap[d.risk])
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.3)
      .attr("filter", "url(#glow)")
      .transition()
      .duration(600)
      .delay((_, i) => i * 80)
      .attr("r", (d: any) => 8 + (d.mastery / 100) * 12);

    nodes.append("text")
      .text((d: any) => d.label)
      .attr("text-anchor", "middle")
      .attr("dy", (d: any) => -(12 + (d.mastery / 100) * 12) - 6)
      .attr("fill", "hsl(210,40%,80%)")
      .attr("font-size", "10px")
      .attr("font-family", "Inter, sans-serif")
      .attr("opacity", 0)
      .transition()
      .delay((_, i) => i * 80 + 400)
      .attr("opacity", 1);

    nodes.on("click", (_, d: any) => {
      setSelectedNode(knowledgeGraphNodes.find(n => n.id === d.id) || null);
    });

    simulation.on("tick", () => {
      links
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);
      nodes.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => { simulation.stop(); };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Knowledge Graph</h1>
        <p className="text-sm text-muted-foreground mt-1">Structural learning gaps with risk-colored nodes</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {Object.entries(riskColorMap).map(([level, color]) => (
          <div key={level} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-muted-foreground capitalize">{level}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div ref={containerRef} className="glass rounded-xl p-4 lg:col-span-3">
          <svg ref={svgRef} className="w-full" style={{ height: 500 }} />
        </div>

        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass rounded-xl p-5 space-y-4"
        >
          <h3 className="text-sm font-semibold text-foreground">
            {selectedNode ? selectedNode.label : "Node Details"}
          </h3>
          {selectedNode ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Group</p>
                <p className="text-sm text-foreground">{selectedNode.group}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mastery</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-2 rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${selectedNode.mastery}%`, backgroundColor: riskColorMap[selectedNode.risk] }} />
                  </div>
                  <span className="text-xs font-mono text-foreground">{selectedNode.mastery}%</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Risk Level</p>
                <span className="text-sm font-semibold capitalize" style={{ color: riskColorMap[selectedNode.risk] }}>
                  {selectedNode.risk}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Connected Concepts</p>
                <div className="mt-1 space-y-1">
                  {knowledgeGraphLinks
                    .filter(l => l.source === selectedNode.id || l.target === selectedNode.id)
                    .map((l, i) => {
                      const otherId = l.source === selectedNode.id ? l.target : l.source;
                      const other = knowledgeGraphNodes.find(n => n.id === otherId);
                      return other ? (
                        <p key={i} className="text-xs text-muted-foreground">
                          → {other.label} <span className="font-mono">({(l.strength * 100).toFixed(0)}%)</span>
                        </p>
                      ) : null;
                    })}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Click a node to see details</p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default KnowledgeGraph;
