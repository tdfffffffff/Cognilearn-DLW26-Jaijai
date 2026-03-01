"""
Knowledge Graph — risk propagation using NetworkX.

Topics as directed graph. When error classifier flags a Conceptual gap or
Application failure in Topic A → propagate risk score to all downstream
dependent topics.
"""

from __future__ import annotations

import networkx as nx

from .data import PREREQUISITE_GRAPH, TOPICS
from .schemas import ErrorDiagnosis, ErrorType, KnowledgeEdge, KnowledgeGraphState, KnowledgeNode


def build_knowledge_graph(diagnoses: list[ErrorDiagnosis]) -> KnowledgeGraphState:
    """Build knowledge graph and propagate risk from diagnosed error topics."""

    G = nx.DiGraph()

    # Add all topics as nodes
    for tid, tname in TOPICS:
        G.add_node(tid, name=tname, risk=0.0, error_type=None)

    # Add prerequisite edges
    for src, tgt in PREREQUISITE_GRAPH:
        G.add_edge(src, tgt, relation="prerequisite")

    # Seed risk from error diagnoses
    risk_types = {ErrorType.CONCEPTUAL, ErrorType.APPLICATION}
    for diag in diagnoses:
        if diag.error_type in risk_types:
            base_risk = 1.0 - diag.confidence * 0.3  # higher confidence → higher risk
            G.nodes[diag.topic_id]["risk"] = float(min(base_risk, 1.0))
            G.nodes[diag.topic_id]["error_type"] = diag.error_type.value

    # Propagate risk downstream (BFS-like, decayed)
    for node in list(G.nodes):
        if G.nodes[node]["risk"] > 0:
            _propagate(G, node, G.nodes[node]["risk"], decay=0.6)

    # Build output
    nodes = []
    for tid in G.nodes:
        data = G.nodes[tid]
        et = ErrorType(data["error_type"]) if data.get("error_type") else None
        nodes.append(KnowledgeNode(
            topic_id=tid,
            topic_name=data["name"],
            risk_score=round(data["risk"], 3),
            error_type=et,
        ))

    edges = [
        KnowledgeEdge(source=u, target=v, relation=d.get("relation", "prerequisite"))
        for u, v, d in G.edges(data=True)
    ]

    at_risk = [n.topic_id for n in nodes if n.risk_score >= 0.4]

    return KnowledgeGraphState(nodes=nodes, edges=edges, at_risk_topics=at_risk)


def _propagate(G: nx.DiGraph, source: str, risk: float, decay: float):
    """Propagate risk from source to downstream dependents."""
    for successor in G.successors(source):
        propagated = risk * decay
        current = G.nodes[successor]["risk"]
        if propagated > current:
            G.nodes[successor]["risk"] = propagated
            if not G.nodes[successor].get("error_type"):
                G.nodes[successor]["error_type"] = "propagated_risk"
            _propagate(G, successor, propagated, decay)
