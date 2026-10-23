// 이계 저장 시 오류 검사. 경고만 하고 저장은 막지 않는다.
type NodeLite = { id: string; name: string; isExit: boolean; scenes: { id: string; kind: string; name: string; choices: { id: string; text: string; checkType: string | null; successOutcomeId: string | null; failOutcomeId: string | null }[] }[] };
type EdgeLite = { fromId: string; toId: string };

export function validateRealm(realm: { startNodeId: string | null; nodes: NodeLite[]; edges: EdgeLite[] }): string[] {
  const warnings: string[] = [];
  if (!realm.startNodeId || !realm.nodes.some((n) => n.id === realm.startNodeId)) warnings.push("시작 노드가 지정되지 않았습니다.");
  if (!realm.nodes.some((n) => n.isExit)) warnings.push("출구 노드가 없습니다. 유저가 탈출할 수 없습니다 (귀환 비컨 제외).");
  const connected = new Set<string>();
  for (const e of realm.edges) { connected.add(e.fromId); connected.add(e.toId); }
  for (const n of realm.nodes) {
    if (realm.nodes.length > 1 && !connected.has(n.id)) warnings.push(`노드 "${n.name}"이(가) 어떤 노드와도 연결되지 않았습니다.`);
    if (!n.scenes.some((s) => s.kind === "BASE")) warnings.push(`노드 "${n.name}"에 기본 장면이 없습니다.`);
    for (const s of n.scenes) {
      for (const c of s.choices) {
        const where = `노드 "${n.name}" ${s.kind === "EVENT" ? `이벤트 "${s.name || "(이름 없음)"}"` : "기본 장면"}`;
        if (!c.text.trim()) warnings.push(`${where}에 문구가 비어 있는 선택지가 있습니다.`);
        if (!c.successOutcomeId) warnings.push(`${where}의 선택지 "${c.text}"에 결과가 없습니다.`);
        if (c.checkType && !c.failOutcomeId) warnings.push(`${where}의 선택지 "${c.text}"에 판정 실패 결과가 없습니다.`);
      }
      if (s.kind === "EVENT" && s.choices.length === 0) warnings.push(`노드 "${n.name}" 이벤트 "${s.name || "(이름 없음)"}"에 선택지가 없습니다.`);
    }
  }
  return warnings;
}
