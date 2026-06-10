import { create } from 'zustand'

interface AudioPlayerState {
  activeTrackId: string | null
  setActiveTrackId: (id: string | null) => void
}

export const useAudioPlayerStore = create<AudioPlayerState>((set) => ({
  activeTrackId: null,
  setActiveTrackId: (id) => set({ activeTrackId: id }),
}))
