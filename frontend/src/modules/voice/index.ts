// Cửa ra của module voice (UC12, TV-Voice phụ trách).
// Module khác chỉ import những gì export ở đây, muốn cho dùng thêm gì thì thêm vào file này.
export { initVoiceModule } from './module';
export { VoiceRoomView } from './presentation/VoiceRoomView';
export { VoiceSettingsPanel } from './presentation/VoiceSettingsPanel';
export { VoiceChannelParticipants } from './presentation/VoiceWidgets';
export { VoiceControls } from './presentation/VoiceWidgets';
export { VoiceStatusPanel } from './presentation/VoiceWidgets';
export { VoiceAudioSink } from './presentation/VoiceWidgets';
