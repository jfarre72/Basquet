import { getPlayerAvatarUrl } from '../lib/avatars';

/**
 * Foto del jugador para mostrar al lado del nombre. Si el jugador no tiene
 * foto cargada, no renderiza nada (la vista queda igual que antes).
 */
export function PlayerAvatar({
  id,
  size = 'sm',
}: {
  id: number;
  size?: 'sm' | 'md';
}) {
  const url = getPlayerAvatarUrl(id);
  if (!url) return null;
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      className={`player-avatar player-avatar--${size}`}
    />
  );
}
