export function FieldError({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null;

  return (
    <p role="alert" className="text-sm font-medium text-destructive">
      {messages[0]}
    </p>
  );
}
