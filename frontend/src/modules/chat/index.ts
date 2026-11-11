// Cửa ra của module chat (UC07, UC08, UC09, UC10, UC17, TV-Chat phụ trách).
// Module khác chỉ import những gì export ở đây, muốn cho dùng thêm gì thì thêm vào file này.
export { initChatModule } from './module';
export { AttachmentView } from './presentation/AttachmentView';
export { ChatView } from './presentation/ChatView';
export { Composer } from './presentation/Composer';
export { MessageContent } from './presentation/MessageContent';
export { MessageItem } from './presentation/MessageItem';
export { MessageList } from './presentation/MessageList';
export { PinnedButton } from './presentation/PinnedPanel';
export { SearchBox } from './presentation/SearchBox';
export { TypingIndicator } from './presentation/TypingIndicator';
