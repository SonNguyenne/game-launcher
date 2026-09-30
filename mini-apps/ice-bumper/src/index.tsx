import { useEffect, useState } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import { PartyShell, ResultCard, useParty, type PartyData } from '@bang/party';
import { Button } from '@bang/ui';
import { iceBumperGame, type SnowarParty } from './game';
import { DEFAULT_SKIN, type PenguinSkin } from './avatar';
import { SkinEditor } from './SkinEditor';
import { SnowarCanvasArena } from './SnowarCanvasArena';
import { strings } from './strings';
import s from './IceBumper.module.css';
import iconSvg from '../icon.svg?raw';

function SnowarGame({ party }: { party: SnowarParty }) {
  const st = party.state;
  const isHost = party.isHost;
  const myId = party.me;

  const [mySkin, setMySkin] = useState<PenguinSkin>(() => {
    return st?.lobbySkins[myId] ?? DEFAULT_SKIN;
  });

  const handleSkinChange = (skin: PenguinSkin) => {
    setMySkin(skin);
    party.dispatch({ type: 'set_skin', skin });
  };

  useEffect(() => {
    if (st && !st.lobbySkins[myId]) {
      party.dispatch({ type: 'set_skin', skin: mySkin });
    }
  }, [st, myId, mySkin, party]);

  if (!st || st.stage === 'lobby') {
    return (
      <div className={s.lobby}>
        <h2 className={s.lobbyTitle}>Snowar.io · Đấu Cầu Tuyết</h2>
        <p className={s.lobbyDesc}>
          Ủi cầu tuyết khổng lồ và húc văng đối thủ khỏi đảo băng nổi!
        </p>

        {/* Trình tạo/tùy chỉnh xe ủi & Cánh cụt */}
        <SkinEditor
          skin={mySkin}
          onChange={handleSkinChange}
          name={party.players.find((p) => p.id === myId)?.name ?? 'Tôi'}
        />

        {isHost ? (
          <Button
            variant="primary"
            onClick={() => party.dispatch({ type: 'start_game' })}
          >
            Bắt đầu chiến ({party.players.length} người)
          </Button>
        ) : (
          <Button disabled>
            Chờ chủ phòng bắt đầu trận đấu...
          </Button>
        )}
      </div>
    );
  }

  // Màn hình thi đấu Snowar xoay ngang toàn màn hình
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <SnowarCanvasArena party={party} />

      {/* Nút hành động hiệp / kết thúc cho chủ phòng */}
      {st.stage === 'round_over' && isHost && (
        <div className={s.hostActionsBar}>
          <Button variant="primary" onClick={() => party.dispatch({ type: 'next_round' })}>
            Hiệp tiếp theo ({st.round + 1}/{st.maxRounds})
          </Button>
        </div>
      )}

      {st.stage === 'game_over' && isHost && (
        <div className={s.hostActionsBar}>
          <Button variant="primary" onClick={() => party.dispatch({ type: 'restart' })}>
            Bắt đầu trận mới
          </Button>
        </div>
      )}

      {/* Kết quả hiệp đấu hoặc hết trận */}
      {st.result && (
        <ResultCard
          party={party}
          show={!!st.result}
          actionLabel={st.stage === 'game_over' ? 'Xong trận' : 'Hiệp kế'}
        />
      )}
    </div>
  );
}

export default function IceBumper({ ctx }: MiniAppProps<PartyData>) {
  const party = useParty(iceBumperGame, ctx);

  return (
    <PartyShell
      party={party}
      together
      info={{
        title: strings.title,
        rule: strings.rule,
        art: <span dangerouslySetInnerHTML={{ __html: iconSvg }} />,
      }}
    >
      <SnowarGame party={party} />
    </PartyShell>
  );
}
