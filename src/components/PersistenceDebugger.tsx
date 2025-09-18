import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Bug, CheckCircle, Database, Hammer, Trash, XCircle } from '@phosphor-icons/react';
import { useState } from 'react';
import { toast } from 'sonner';

export function PersistenceDebugger() {
	const [open, setOpen] = useState(false);
	const [busy, setBusy] = useState<'repair' | 'reset' | null>(null);
	const [lastResult, setLastResult] = useState<{ action: string; ok: boolean; message?: string } | null>(null);

	const handleRepair = async () => {
		setBusy('repair');
		try {
			const mod = await import('@/lib/db');
			const res = await mod.repairDatabase();
			if (res.ok) {
				setLastResult({ action: 'Repair', ok: true });
				toast.success('Database repair completed');
			} else {
				setLastResult({ action: 'Repair', ok: false, message: res.error });
				toast.error(`Repair failed: ${res.error || 'Unknown error'}`);
			}
		} catch (e: any) {
			setLastResult({ action: 'Repair', ok: false, message: String(e?.message || e) });
			toast.error('Repair failed');
		} finally {
			setBusy(null);
		}
	};

	const handleReset = async () => {
		if (!confirm('This will erase all app data (characters, chats, images metadata). Continue?')) {
			return;
		}
		setBusy('reset');
		try {
			const mod = await import('@/lib/db');
			const res = await mod.resetDatabase();
			if (res.ok) {
				setLastResult({ action: 'Factory Reset', ok: true });
				toast.success('Database reset. Reloading...');
				setTimeout(() => window.location.reload(), 500);
			} else {
				setLastResult({ action: 'Factory Reset', ok: false, message: res.error });
				toast.error(`Reset failed: ${res.error || 'Unknown error'}`);
			}
		} catch (e: any) {
			setLastResult({ action: 'Factory Reset', ok: false, message: String(e?.message || e) });
			toast.error('Reset failed');
		} finally {
			setBusy(null);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="ghost" size="icon" title="Persistence tools">
					<Bug size={16} />
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-xl bg-gray-900 text-white" style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-white">
						<Database size={18} />
						Persistence Tools
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="text-lg">Repair</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<p className="text-sm text-muted-foreground">
								Re-applies schema and migrations. Safe; no data loss expected.
							</p>
							<Button onClick={handleRepair} disabled={busy !== null}>
								<Hammer size={16} className="mr-2" />
								{busy === 'repair' ? 'Repairing…' : 'Repair DB'}
							</Button>
						</CardContent>
					</Card>

					<Separator />

					<Card>
						<CardHeader>
							<CardTitle className="text-lg">Factory Reset</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<Alert>
								<AlertDescription>
									This will DROP all tables and recreate an empty database. This cannot be undone.
								</AlertDescription>
							</Alert>
							<Button variant="destructive" onClick={handleReset} disabled={busy !== null}>
								<Trash size={16} className="mr-2" />
								{busy === 'reset' ? 'Resetting…' : 'Factory Reset'}
							</Button>
						</CardContent>
					</Card>

					{lastResult && (
						<div className="flex items-center gap-2 text-sm">
							{lastResult.ok ? (
								<CheckCircle size={16} className="text-green-500" />
							) : (
								<XCircle size={16} className="text-red-500" />
							)}
							<span>
								{lastResult.action}: {lastResult.ok ? 'Success' : `Failed${lastResult.message ? ` — ${lastResult.message}` : ''}`}
							</span>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
