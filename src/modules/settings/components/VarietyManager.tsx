/**
 * VarietyManager - Manage variety configurations
 *
 * Add, edit, and remove custom microgreen varieties.
 */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { growDb, toKey, withId, type GrowVarietyConfig } from '@/lib/db';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const varietySchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  seedCostPerKg: z.number().min(0).max(1000),
  defaultBlackoutDays: z.number().min(1).max(10),
  preSoakRequired: z.boolean(),
  typicalDaysToHarvest: z.number().min(5).max(30),
});

type VarietyFormData = z.infer<typeof varietySchema>;

export function VarietyManager() {
  const [varieties, setVarieties] = useState<GrowVarietyConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VarietyFormData>({
    resolver: zodResolver(varietySchema),
    defaultValues: {
      name: '',
      seedCostPerKg: 50,
      defaultBlackoutDays: 3,
      preSoakRequired: false,
      typicalDaysToHarvest: 10,
    },
  });

  const loadVarieties = async () => {
    try {
      // Ids are strings above the database boundary; see src/lib/db/keys.ts.
      const configs = (await growDb.varietyConfigs.toArray()).map(withId);
      setVarieties(configs);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVarieties();
  }, []);

  const handleAdd = () => {
    setEditingId(null);
    reset({
      name: '',
      seedCostPerKg: 50,
      defaultBlackoutDays: 3,
      preSoakRequired: false,
      typicalDaysToHarvest: 10,
    });
    setShowForm(true);
    setMessage(null);
  };

  const handleEdit = (variety: GrowVarietyConfig) => {
    setEditingId(variety.id!);
    reset({
      name: variety.name,
      seedCostPerKg: variety.seedCostPerKg,
      defaultBlackoutDays: variety.defaultBlackoutDays,
      preSoakRequired: variety.preSoakRequired,
      typicalDaysToHarvest: variety.typicalDaysToHarvest,
    });
    setShowForm(true);
    setMessage(null);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      await growDb.varietyConfigs.delete(toKey(deleteConfirmId));
      setMessage({ type: 'success', text: 'Variety deleted' });
      loadVarieties();
    } catch (error) {
      setMessage({ type: 'error', text: (error as Error).message });
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    reset();
  };

  const onSubmit = async (data: VarietyFormData) => {
    try {
      if (editingId) {
        await growDb.varietyConfigs.update(toKey(editingId), data);
        setMessage({ type: 'success', text: 'Variety updated' });
      } else {
        // Check for duplicate name
        const existing = await growDb.varietyConfigs
          .where('name')
          .equals(data.name)
          .first();
        if (existing) {
          setMessage({ type: 'error', text: 'A variety with this name already exists' });
          return;
        }
        await growDb.varietyConfigs.add(data as GrowVarietyConfig);
        setMessage({ type: 'success', text: 'Variety added' });
      }
      setShowForm(false);
      setEditingId(null);
      reset();
      loadVarieties();
    } catch (error) {
      setMessage({ type: 'error', text: (error as Error).message });
    }
  };

  if (isLoading) {
    return (
      <section className="card p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-40 mb-4" />
          <div className="space-y-2">
            <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Variety Management
        </h2>
        {!showForm && (
          <button
            type="button"
            onClick={handleAdd}
            className="btn btn-primary text-sm"
          >
            + Add Variety
          </button>
        )}
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mb-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
        >
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
            {editingId ? 'Edit Variety' : 'Add New Variety'}
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Variety Name
              </label>
              <input
                type="text"
                {...register('name')}
                className="input w-full"
                placeholder="e.g. Sunflower"
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Seed Cost ($/kg)
              </label>
              <input
                type="number"
                step="0.01"
                {...register('seedCostPerKg', { valueAsNumber: true })}
                className="input w-full"
              />
              {errors.seedCostPerKg && (
                <p className="text-red-500 text-xs mt-1">{errors.seedCostPerKg.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Blackout Days
              </label>
              <input
                type="number"
                {...register('defaultBlackoutDays', { valueAsNumber: true })}
                className="input w-full"
                min={1}
                max={10}
              />
              {errors.defaultBlackoutDays && (
                <p className="text-red-500 text-xs mt-1">{errors.defaultBlackoutDays.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Days to Harvest
              </label>
              <input
                type="number"
                {...register('typicalDaysToHarvest', { valueAsNumber: true })}
                className="input w-full"
                min={5}
                max={30}
              />
              {errors.typicalDaysToHarvest && (
                <p className="text-red-500 text-xs mt-1">{errors.typicalDaysToHarvest.message}</p>
              )}
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="preSoakRequired"
                {...register('preSoakRequired')}
                className="h-4 w-4 text-primary-600 rounded border-slate-300 dark:border-slate-600"
              />
              <label
                htmlFor="preSoakRequired"
                className="ml-2 text-sm text-slate-700 dark:text-slate-300"
              >
                Requires Pre-Soak
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Update' : 'Add'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="btn bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Variety List */}
      <div className="space-y-2">
        {varieties.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 text-center py-8">
            No varieties configured. Add some to get started!
          </p>
        ) : (
          varieties.map((variety) => (
            <div
              key={variety.id}
              className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
            >
              <div className="flex-1">
                <div className="font-medium text-slate-900 dark:text-white">
                  {variety.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {variety.defaultBlackoutDays}d blackout • {variety.typicalDaysToHarvest}d harvest
                  {variety.preSoakRequired && ' • Pre-soak'}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleEdit(variety)}
                  className="px-2 py-1 text-xs text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteClick(variety.id!)}
                  className="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Variety"
        message="Are you sure you want to delete this variety? This will not affect existing trays using this variety."
        confirmLabel="Delete"
        variant="danger"
      />
    </section>
  );
}
