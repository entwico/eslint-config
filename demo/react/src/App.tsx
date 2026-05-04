import { Card } from './components/Card.js';
import { ExpandableText } from './components/ExpandableText.js';

export function App() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-8">
      <Card title="Hello">
        <ExpandableText maxLines={3}>
          A short snippet of text that may or may not need expanding depending on viewport width.
        </ExpandableText>
      </Card>
    </main>
  );
}
