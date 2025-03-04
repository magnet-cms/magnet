export const Spinner = () => {
	return (
		<div className="spinner">
			{Array.from({ length: 6 }).map(() => (
				<div key={crypto.randomUUID()} />
			))}
		</div>
	)
}
