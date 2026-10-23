// 편집기 셀렉트 박스에 넘기는 목록 타입 (서버에서 조회해 클라이언트 컴포넌트로 전달)
export type Opt = { id: string; name: string };
export type EditorOptions = {
  items: Opt[];
  dropTables: Opt[];
  tags: Opt[];
  nodes: Opt[];
  scenes: Opt[]; // 현재 노드의 장면들
};
