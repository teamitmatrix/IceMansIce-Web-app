export default function Page({ params }: { params: { invoiceId: string } }) {
	const { invoiceId } = params
	return (
		<div className="p-6">
			<h1 className="text-2xl font-semibold mb-2">Driver Payment</h1>
			<p className="text-sm text-muted-foreground">Invoice ID: {invoiceId}</p>
			<p className="mt-4">This page is under construction.</p>
		</div>
	)
}

