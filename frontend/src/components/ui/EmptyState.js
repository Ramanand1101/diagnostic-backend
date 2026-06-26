export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="card text-center py-16">
      {Icon && <Icon className="text-4xl text-gray-300 mx-auto mb-3" />}
      <h3 className="text-gray-600 font-medium mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-400 mb-4">{description}</p>}
      {action}
    </div>
  );
}
