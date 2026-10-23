// 샘플 고정 이계 "구 성모요양병원". 운영자가 편집기에서 고치거나 지울 수 있는 데이터다.
// 이미 같은 이름의 이계가 있으면 아무것도 하지 않는다.
import type { PrismaClient, Prisma } from "@prisma/client";

type Eff = Record<string, unknown>;

export async function seedSampleRealm(db: PrismaClient) {
  const NAME = "구 성모요양병원";
  if (await db.realm.findFirst({ where: { name: NAME } })) { console.log(`샘플 이계 "${NAME}" 이미 있음`); return; }

  // 아이템
  const byName = async (name: string) => (await db.item.findFirst({ where: { name } }))!;
  const ensureItem = async (data: Prisma.ItemCreateInput) => (await db.item.findFirst({ where: { name: data.name } })) ?? db.item.create({ data });
  const key = await ensureItem({ name: "녹슨 열쇠", description: "병원 간호사실 서랍에서 나온 열쇠. 꼬리표에 'B1'이라고 적혀 있다.", category: "KEY", effects: [{ type: "narrative", text: "지하로 내려가는 문을 연다" }], usableIn: "RUN", stackLimit: 1, sellPrice: 0, sortOrder: 50 });
  const bag = await ensureItem({ name: "감염된 수액팩", description: "유통기한이 20년 지났는데 내용물이 아직도 따뜻하다. 프로그램이 회수를 권고하는 감염물.", category: "INFECTED", effects: [{ type: "hp", value: 1 }, { type: "erosion", value: 2 }], usableIn: "BOTH", sellPrice: 25, sortOrder: 60 });
  const potion = await byName("회복약");
  const sedative = await byName("정신 안정제");
  const suppressant = await byName("침식 억제제");

  // 드랍 테이블
  let table = await db.dropTable.findFirst({ where: { name: "폐병원 잡동사니" } });
  if (!table) {
    table = await db.dropTable.create({ data: { name: "폐병원 잡동사니", entries: { create: [
      { itemId: potion.id, weight: 3, minQty: 1, maxQty: 1 },
      { itemId: sedative.id, weight: 2, minQty: 1, maxQty: 1 },
      { itemId: bag.id, weight: 2, minQty: 1, maxQty: 2 },
      { itemId: null, weight: 5, minQty: 1, maxQty: 1 },
    ] } } });
  }

  const realm = await db.realm.create({ data: {
    name: NAME, kind: "FIXED", isPublished: true, mapX: 82.1, mapY: 35.9,
    intro: "2006년 여름 이후 폐쇄된 요양병원. 밤마다 수술실 불이 켜진다는 소문이 돌고, 프로그램은 이 자리에서 꾸준히 이계 신호를 감지하고 있다. 봉합 불가 판정. 내부 구조는 탐사한 유저들이 밝혀 나간다.",
  } });

  // 노드
  const mk = async (name: string, depth: number, description: string, pos: [number, number], extra: Partial<Prisma.NodeUncheckedCreateInput> = {}) =>
    db.node.create({ data: { realmId: realm.id, name, depth, description, posX: pos[0], posY: pos[1], ...extra } });

  const lobby = await mk("정문 로비", 1, "유리문은 안쪽에서 널빤지로 막혀 있지만, 당신은 이미 안에 서 있다. 접수대 위 달력은 2006년 7월에 멈춰 있고, 천장의 형광등이 하나씩 차례로 켜진다. 마치 누군가 당신을 안내하는 것처럼.", [300, 0], { isExit: true, rewardNew: 20 });
  const hall = await mk("1층 복도", 1, "소독약 냄새가 밴 긴 복도. 바닥의 유도선이 두 방향으로 갈라진다. 어느 쪽 끝도 어둠에 잠겨 있고, 멀리서 바퀴 달린 무언가가 굴러가는 소리가 난다.", [300, 160]);
  const station = await mk("간호사실", 1, "간호사실의 유리창에는 안쪽에서 붙인 메모가 빼곡하다. 전부 같은 필체, 전부 같은 문장. '아직 아니다.' 서랍 하나가 조금 열려 있다.", [60, 320]);
  const stairs = await mk("계단실", 2, "비상계단. 위로는 옥상, 아래로는 지하. 벽에 그어진 층 표시가 B1, 1, 2, 3, 2, 1, B1 순서로 반복된다. 올라가는지 내려가는지는 당신이 정하는 것 같다.", [540, 320]);
  const morgue = await mk("영안실", 3, "영안실. 냉동고 문들이 전부 닫혀 있는데 모터 소리는 한 칸에서만 난다. 벽의 온도계는 영하 20도인데 입김이 나지 않는다.", [300, 480], { rewardNew: 50 });
  const surgery = await mk("수술실", 2, "수술실 불이 켜져 있다. 소문은 사실이었다. 수술대 위에 길쭉한 그림자가 누워 있는데, 그림자를 만드는 물체가 없다.", [760, 480], { rewardNew: 40 });
  const roof = await mk("옥상", 2, "옥상. 밤공기가 차다. 도시의 불빛이 보이는데, 자세히 보면 두 겹으로 겹쳐 있다. 하나는 익숙한 도시, 하나는 조금 다른 도시. 여기서는 아래로 내려가 빠져나갈 수 있을 것 같다.", [540, 640], { isExit: true, rewardNew: 40 });
  const basement = await mk("지하 배전실", 3, "지하 배전실. 배전반마다 손으로 쓴 라벨이 붙어 있는데 글자가 한국어도, 영어도 아니다. 커다란 레버 하나만 색이 다르다. 최근에 누군가 닦은 것처럼.", [760, 640], { rewardNew: 60, entryErosion: 4 });
  await db.realm.update({ where: { id: realm.id }, data: { startNodeId: lobby.id } });

  // 연결
  const link = (fromId: string, toId: string, extra: Partial<Prisma.EdgeUncheckedCreateInput> = {}) => db.edge.create({ data: { realmId: realm.id, fromId, toId, bidirectional: true, ...extra } });
  await link(lobby.id, hall.id);
  await link(hall.id, station.id);
  await link(hall.id, stairs.id);
  await link(hall.id, morgue.id, { checkType: "GENERAL", checkTarget: 7, failText: "영안실 문이 얼어붙어 있다. 힘을 주다 손바닥이 찢어졌다.", failEffects: [{ type: "hp", value: -1 }] });
  await link(stairs.id, surgery.id);
  await link(stairs.id, roof.id);
  await link(stairs.id, basement.id, { conditions: [{ type: "item", itemId: key.id }], failText: "지하로 내려가는 철문이 잠겨 있다. 'B1' 꼬리표가 달린 열쇠가 맞을 것 같다." });

  // 장면과 선택지
  const scene = (nodeId: string, kind: "BASE" | "EVENT", text: string, extra: Partial<Prisma.SceneUncheckedCreateInput> = {}) => db.scene.create({ data: { nodeId, kind, text, ...extra } });
  const choice = async (sceneId: string, text: string, opts: { conditions?: Eff[]; locked?: "HIDE" | "SHOW_LOCKED"; check?: ["COMBAT" | "SEARCH" | "GENERAL", number]; once?: boolean; success: [string, Eff[]]; fail?: [string, Eff[]]; order?: number }) => {
    const s = await db.outcome.create({ data: { text: opts.success[0], effects: opts.success[1] as Prisma.InputJsonValue } });
    const f = opts.fail ? await db.outcome.create({ data: { text: opts.fail[0], effects: opts.fail[1] as Prisma.InputJsonValue } }) : null;
    return db.choice.create({ data: {
      sceneId, text, conditions: (opts.conditions ?? []) as Prisma.InputJsonValue, lockedDisplay: opts.locked ?? "HIDE",
      checkType: opts.check?.[0] ?? null, checkTarget: opts.check?.[1] ?? null, oncePerRun: opts.once ?? false, sortOrder: opts.order ?? 0,
      successOutcomeId: s.id, failOutcomeId: f?.id ?? null,
    } });
  };

  // 정문 로비
  const sLobby = await scene(lobby.id, "BASE", "");
  await choice(sLobby.id, "접수대의 장부를 넘겨 본다", { check: ["GENERAL", 5], once: true,
    success: ["마지막 접수 날짜는 2006년 7월 11일. 그날 접수된 환자는 한 명뿐이고, 이름 칸이 비어 있다. 대신 '신생아'라고만 적혀 있다.", [{ type: "clue", text: "2006년 7월 11일, 마지막 환자는 이름 없는 신생아.", flag: "clue_lobby_ledger" }, { type: "points", value: 5 }]],
    fail: ["장부의 이름이 전부 당신의 이름이다. 황급히 덮었다.", [{ type: "mp", value: -1 }]] });

  // 1층 복도
  const sHall = await scene(hall.id, "BASE", "");
  await choice(sHall.id, "약품 보관함을 뒤진다", { check: ["SEARCH", 7], once: true,
    success: ["먼지 쌓인 선반 뒤에서 쓸 만한 것을 찾았다.", [{ type: "item_drop", tableId: table.id, rolls: 2 }]],
    fail: ["선반이 무너져 내렸다. 유리 조각이 팔을 그었다.", [{ type: "hp", value: -1 }]] });
  const eHall = await scene(hall.id, "EVENT", "복도 끝에서 무언가가 붕대를 질질 끌며 다가온다. 붕대 아래에 사람의 형체는 없다. 붕대만이 사람의 모양으로 움직인다.", { name: "적대: 붕대 감은 것", chance: 40, mandatory: false, sortOrder: 1 });
  await choice(eHall.id, "붕대 감은 것에게 맞선다", { conditions: [{ type: "category", value: "COMBAT" }], locked: "SHOW_LOCKED", check: ["COMBAT", 7], once: true, order: 0,
    success: ["붕대가 풀리며 바닥에 흩어졌다. 그 안에는 아무것도 없었다.", [{ type: "points", value: 20 }, { type: "item_drop", tableId: table.id, rolls: 1 }]],
    fail: ["붕대가 팔을 휘감았다. 뿌리치고 나왔지만 살갗이 벗겨졌다.", [{ type: "hp", value: -2 }]] });
  await choice(eHall.id, "우회한다", { check: ["SEARCH", 7], order: 1,
    success: ["병실 문 뒤에 숨어 그것이 지나가길 기다렸다.", []],
    fail: ["들켰다. 붕대가 발목을 낚아챘다.", [{ type: "hp", value: -2 }]] });
  await choice(eHall.id, "도주한다", { order: 2, success: ["왔던 길로 달아났다. 등 뒤에서 붕대 스치는 소리가 한참 따라왔다.", [{ type: "hp", value: -1 }, { type: "move_back" }]] });

  // 간호사실
  const sStation = await scene(station.id, "BASE", "");
  await choice(sStation.id, "열린 서랍을 들여다본다", { once: true, conditions: [{ type: "not_flag", flag: "took_key" }],
    success: ["서랍 안에는 녹슨 열쇠 하나. 꼬리표에 'B1'이라고 적혀 있다.", [{ type: "item_gain", itemId: key.id, qty: 1 }, { type: "set_flag", flag: "took_key" }]] });
  await choice(sStation.id, "게시판의 메모를 읽는다", { once: true, order: 1,
    success: ["메모 더미 맨 아래, 다른 필체의 쪽지 하나. '지하는 우리 소관이 아님. 본부 지시 대기.' 본부라니, 어디의 본부인가.", [{ type: "clue", text: "'지하는 우리 소관이 아님. 본부 지시 대기.' 병원이 아닌 누군가의 메모.", flag: "clue_hq" }]] });

  // 계단실
  await scene(stairs.id, "BASE", "");
  const eStairs = await scene(stairs.id, "EVENT", "계단의 불이 한꺼번에 꺼졌다. 손을 뻗어도 난간이 잡히지 않는다.", { name: "불 꺼진 계단", chance: 30, sortOrder: 1 });
  await choice(eStairs.id, "벽을 짚고 천천히 움직인다", { check: ["GENERAL", 7],
    success: ["손끝에 벽이 닿았다. 불이 다시 켜질 때까지 숨을 죽였다.", []],
    fail: ["발을 헛디뎠다. 떨어진 것은 두 계단인데 체감은 두 층이었다.", [{ type: "hp", value: -1 }, { type: "mp", value: -1 }]] });

  // 영안실
  await scene(morgue.id, "BASE", "");
  const eMorgue = await scene(morgue.id, "EVENT", "모터 소리가 나는 냉동고의 문이 안쪽에서 천천히 밀린다.", { name: "적대: 냉동고 안의 것", chance: 60, sortOrder: 1 });
  await choice(eMorgue.id, "문을 열어젖히고 맞선다", { conditions: [{ type: "category", value: "COMBAT" }], locked: "SHOW_LOCKED", check: ["COMBAT", 9], once: true, order: 0,
    success: ["안에 있던 것은 당신을 보자마자 얼어붙었다. 말 그대로.", [{ type: "points", value: 40 }, { type: "item_gain", itemId: bag.id, qty: 2 }]],
    fail: ["냉기가 폐를 찔렀다. 문을 도로 밀어 닫는 데 온 힘을 썼다.", [{ type: "hp", value: -3 }]] });
  await choice(eMorgue.id, "귀를 막고 지나간다", { check: ["GENERAL", 5], order: 1,
    success: ["소리를 듣지 않으면 그것은 당신을 보지 못하는 것 같다.", []],
    fail: ["손가락 사이로 소리가 새어 들어왔다. 당신의 이름을 부르는 소리였다.", [{ type: "mp", value: -2 }]] });

  // 수술실
  await scene(surgery.id, "BASE", "");
  const eSurgery = await scene(surgery.id, "EVENT", "수술대 위의 그림자가 고개를 든다. 얼굴이 있어야 할 자리가 당신 쪽을 향한다.", { name: "수술대 위의 그림자", chance: 100, mandatory: true, sortOrder: 1 });
  await choice(eSurgery.id, "그림자에게 말을 건다", { conditions: [{ type: "erosion_stage_at_least", value: "ACTIVE" }], locked: "SHOW_LOCKED", once: true, order: 0,
    success: ["그림자가 대답했다. 소리가 아니라 머릿속에 직접. '방주에서 왔나? 아니군. 아직 모르는군.' 그리고 다시 누웠다.", [{ type: "clue", text: "수술실의 그림자: '방주에서 왔나? 아직 모르는군.'", flag: "clue_ark" }, { type: "erosion", value: 5 }]] });
  await choice(eSurgery.id, "무영등을 켠다", { check: ["SEARCH", 9], once: true, order: 1,
    success: ["빛 아래에서 그림자가 사라지고, 수술대 위에 남은 것은 작은 발찌 하나. 신생아용. 이름표는 비어 있다.", [{ type: "points", value: 40 }, { type: "clue", text: "수술대 위에 남은 신생아 발찌. 이름표는 비어 있다.", flag: "clue_bracelet" }]],
    fail: ["스위치를 올리자 전구가 전부 터졌다. 유리 파편이 쏟아졌다.", [{ type: "hp", value: -2 }]] });
  await choice(eSurgery.id, "조용히 물러난다", { order: 2, success: ["그림자가 다시 눕는다. 당신은 뒷걸음으로 계단실로 돌아왔다.", [{ type: "move_back" }]] });

  // 옥상
  const sRoof = await scene(roof.id, "BASE", "");
  await choice(sRoof.id, "난간 너머의 도시를 오래 바라본다", { once: true,
    success: ["겹쳐 보이는 두 도시 중 하나에는 이 병원이 없다. 그 도시의 자리에는 커다란 구덩이만 있다.", [{ type: "clue", text: "옥상에서 본 겹친 도시. 한쪽에는 병원 자리에 구덩이뿐.", flag: "clue_double_city" }, { type: "mp", value: -1 }]] });

  // 지하 배전실
  const sBase = await scene(basement.id, "BASE", "");
  await choice(sBase.id, "색이 다른 레버를 당긴다", { once: true, conditions: [{ type: "not_flag", flag: "레버를 당겼다" }],
    success: ["레버가 묵직하게 내려갔다. 건물 전체의 소음이 일순 멈추고, 배전반 하나가 벽에서 조금 떨어져 나왔다.", [{ type: "set_flag", flag: "레버를 당겼다" }]] });
  await choice(sBase.id, "떨어져 나온 배전반 뒤를 살핀다", { conditions: [{ type: "flag", flag: "레버를 당겼다" }], check: ["SEARCH", 7], once: true, order: 1,
    success: ["배전반 뒤 벽에 각인이 있다. 'ATRA-HASIS / 07'. 그 아래 선반에 의료용 주사제 한 상자. 프로그램이 파는 것과 같은 것이다.", [{ type: "item_gain", itemId: suppressant.id, qty: 1 }, { type: "clue", text: "지하 배전반 뒤 각인: ATRA-HASIS / 07. 프로그램의 억제제와 같은 약이 보관되어 있었다.", flag: "clue_atrahasis" }]],
    fail: ["배전반에 손을 대자 정전기가 아니라 다른 것이 몸을 타고 올라왔다.", [{ type: "erosion", value: 3 }]] });

  console.log(`샘플 이계 "${NAME}" 생성 (노드 8, 연결 7)`);
}
