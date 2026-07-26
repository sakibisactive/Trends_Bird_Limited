import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Header } from '../components/Header';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Package,
  FolderTree,
  Tag,
  ImageIcon,
  Sliders,
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  Star,
  X,
  AlertCircle,
} from 'lucide-react';

export const ProductFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'details' | 'taxonomy' | 'media' | 'pricingOrVariants'>('details');

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [sku, setSku] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [hasVariants, setHasVariants] = useState(false);
  const [weight, setWeight] = useState<number | ''>('');
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);

  // Taxonomy State
  const [brandId, setBrandId] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);

  // Simple Pricing State
  const [price, setPrice] = useState<number | ''>('');
  const [salePrice, setSalePrice] = useState<number | ''>('');
  const [stock, setStock] = useState<number | ''>('');

  // Media Attachments State
  const [attachedMedia, setAttachedMedia] = useState<any[]>([]);
  const [primaryThumbnailMediaId, setPrimaryThumbnailMediaId] = useState<string | null>(null);

  // Variants State
  const [selectedAttributeIds, setSelectedAttributeIds] = useState<string[]>([]);
  const [selectedAttrValueIds, setSelectedAttrValueIds] = useState<Record<string, string[]>>({});
  const [variants, setVariants] = useState<any[]>([]);

  // External Reference Data
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [attributes, setAttributes] = useState<any[]>([]);
  const [mediaLibrary, setMediaLibrary] = useState<any[]>([]);

  // Modals
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [targetVariantIndexForMedia, setTargetVariantIndexForMedia] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReferenceData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [brandsRes, catRes, attrRes, mediaRes] = await Promise.all([
        api.get('/brands'),
        api.get('/categories'),
        api.get('/attributes'),
        api.get('/media', { params: { type: 'IMAGE' } }),
      ]);

      setBrands(brandsRes.data.brands || []);
      setCategories(categoriesRes.data.categories || []);
      setAttributes(attrRes.data.attributes || []);
      setMediaLibrary(mediaRes.data.media || []);

      if (isEditing) {
        const prodRes = await api.get(`/products/${id}`);
        const p = prodRes.data;

        setName(p.name);
        setSlug(p.slug);
        setSku(p.sku);
        setShortDescription(p.shortDescription || '');
        setLongDescription(p.longDescription || '');
        setHasVariants(p.hasVariants);
        setWeight(p.weight || '');
        setIsActive(p.isActive);
        setIsFeatured(p.isFeatured);
        setSortOrder(p.sortOrder || 0);

        setBrandId(p.brandId || '');
        setCategoryIds(p.categoryIds || []);

        setPrice(p.price !== null ? p.price : '');
        setSalePrice(p.salePrice !== null ? p.salePrice : '');
        setStock(p.stock !== null ? p.stock : '');

        // Media attachments
        const attMedia = (p.media || []).map((m: any) => ({
          mediaId: m.mediaId,
          publicUrl: m.media?.publicUrl,
          title: m.media?.title || m.media?.fileName,
          isThumbnail: m.isThumbnail,
          isGallery: m.isGallery,
        }));
        setAttachedMedia(attMedia);
        const thumb = attMedia.find((m: any) => m.isThumbnail);
        if (thumb) setPrimaryThumbnailMediaId(thumb.mediaId);

        // Variants
        if (p.hasVariants && p.variants) {
          const loadedVariants = p.variants.map((v: any) => ({
            sku: v.sku,
            price: v.price,
            salePrice: v.salePrice !== null ? v.salePrice : '',
            stock: v.stock,
            attributeValueIds: v.attributeValues.map((av: any) => av.attributeValueId),
          }));
          setVariants(loadedVariants);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load form reference data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferenceData();
  }, [id]);

  const toggleCategory = (catId: string) => {
    setCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId],
    );
  };

  const attachMediaAsset = (media: any) => {
    if (targetVariantIndexForMedia !== null) {
      // Attach to specific variant
      setShowMediaPicker(false);
      setTargetVariantIndexForMedia(null);
      return;
    }

    if (!attachedMedia.some((m) => m.mediaId === media.id)) {
      const isFirst = attachedMedia.length === 0;
      const newAttached = [
        ...attachedMedia,
        {
          mediaId: media.id,
          publicUrl: media.publicUrl,
          title: media.title || media.fileName,
          isThumbnail: isFirst,
          isGallery: true,
        },
      ];
      setAttachedMedia(newAttached);
      if (isFirst) setPrimaryThumbnailMediaId(media.id);
    }
    setShowMediaPicker(false);
  };

  const removeAttachedMedia = (mediaId: string) => {
    setAttachedMedia(attachedMedia.filter((m) => m.mediaId !== mediaId));
    if (primaryThumbnailMediaId === mediaId) {
      const remaining = attachedMedia.filter((m) => m.mediaId !== mediaId);
      setPrimaryThumbnailMediaId(remaining[0]?.mediaId || null);
    }
  };

  const setPrimaryThumbnail = (mediaId: string) => {
    setPrimaryThumbnailMediaId(mediaId);
    setAttachedMedia(
      attachedMedia.map((m) => ({
        ...m,
        isThumbnail: m.mediaId === mediaId,
      })),
    );
  };

  // Variant Generator Matrix Logic
  const generateVariantMatrix = () => {
    const selectedAttributes = attributes.filter((a) => selectedAttributeIds.includes(a.id));
    const valueSets: any[][] = [];

    selectedAttributes.forEach((attr) => {
      const valIds = selectedAttrValueIds[attr.id] || [];
      const values = attr.values.filter((v: any) => valIds.includes(v.id));
      if (values.length > 0) {
        valueSets.push(values);
      }
    });

    if (valueSets.length === 0) {
      alert('Please select at least one value for the chosen attributes');
      return;
    }

    const cartesian = (...args: any[][]) =>
      args.reduce((a, b) => a.flatMap((d) => b.map((e) => [d, e].flat())));

    const combinations = valueSets.length === 1 ? valueSets[0].map((v) => [v]) : cartesian(...valueSets);

    const generated = combinations.map((comboArr: any[], idx: number) => {
      const comboValIds = comboArr.map((v) => v.id);
      const comboName = comboArr.map((v) => v.value).join('-');
      const generatedSku = `${sku || 'SKU'}-${comboName.toUpperCase()}`;

      return {
        sku: generatedSku,
        price: price ? Number(price) : 29.99,
        salePrice: '',
        stock: 50,
        attributeValueIds: comboValIds,
        comboLabel: comboArr.map((v) => v.value).join(' / '),
      };
    });

    setVariants(generated);
  };

  const updateVariantField = (index: number, field: string, value: any) => {
    const updated = [...variants];
    updated[index][field] = value;
    setVariants(updated);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !sku.trim()) {
      alert('Product name and SKU are required');
      return;
    }

    setSubmitting(true);
    try {
      const mediaPayload = attachedMedia.map((m, idx) => ({
        mediaId: m.mediaId,
        isThumbnail: m.mediaId === primaryThumbnailMediaId,
        isGallery: true,
        sortOrder: idx,
      }));

      const payload: any = {
        name,
        slug: slug || undefined,
        sku,
        shortDescription,
        longDescription,
        hasVariants,
        weight: weight !== '' ? Number(weight) : undefined,
        isActive,
        isFeatured,
        sortOrder: Number(sortOrder),
        brandId: brandId || null,
        categoryIds,
        media: mediaPayload,
      };

      if (!hasVariants) {
        payload.price = Number(price);
        payload.salePrice = salePrice !== '' ? Number(salePrice) : undefined;
        payload.stock = Number(stock);
      } else {
        payload.variants = variants.map((v) => ({
          sku: v.sku,
          price: Number(v.price),
          salePrice: v.salePrice !== '' ? Number(v.salePrice) : undefined,
          stock: Number(v.stock),
          attributeValueIds: v.attributeValueIds,
        }));
      }

      if (isEditing) {
        await api.put(`/products/${id}`, payload);
      } else {
        await api.post('/products', payload);
      }

      navigate('/products');
    } catch (err: any) {
      setError(err.message || 'Failed to save product');
      alert(err.message || 'Product save failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-50">
      <Header
        title={isEditing ? `Edit Product: ${name}` : 'Create New Product'}
        subtitle="Manage product details, brand, categories, gallery media, and variants"
      />

      <main className="p-8 max-w-6xl mx-auto space-y-6">
        {/* Top Action Toolbar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/products')}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Products
          </button>

          <button
            onClick={handleSubmitProduct}
            disabled={submitting}
            className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-semibold text-xs rounded-xl shadow-lg shadow-sky-600/30 flex items-center gap-2 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{submitting ? 'Saving Product...' : isEditing ? 'Update Product' : 'Save & Publish Product'}</span>
          </button>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Section Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-5 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'details'
                ? 'border-sky-600 text-sky-600 bg-white rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-4 h-4" /> 1. General Details
          </button>

          <button
            onClick={() => setActiveTab('taxonomy')}
            className={`px-5 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'taxonomy'
                ? 'border-sky-600 text-sky-600 bg-white rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Tag className="w-4 h-4" /> 2. Brand & Categories
          </button>

          <button
            onClick={() => setActiveTab('media')}
            className={`px-5 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'media'
                ? 'border-sky-600 text-sky-600 bg-white rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ImageIcon className="w-4 h-4" /> 3. Media & Thumbnail ({attachedMedia.length})
          </button>

          <button
            onClick={() => setActiveTab('pricingOrVariants')}
            className={`px-5 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'pricingOrVariants'
                ? 'border-sky-600 text-sky-600 bg-white rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" /> 4. {hasVariants ? `Variants (${variants.length})` : 'Pricing & Stock'}
          </button>
        </div>

        {/* Tab 1: General Details */}
        {activeTab === 'details' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product Title / Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wireless Ergonomic Mouse"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Main Product SKU *</label>
                <input
                  type="text"
                  required
                  placeholder="MOUSE-W-100"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product Slug (Auto-generated if blank)</label>
                <input
                  type="text"
                  placeholder="wireless-ergonomic-mouse"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product Kind / Structure</label>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="productType"
                      checked={!hasVariants}
                      onChange={() => setHasVariants(false)}
                      className="text-sky-600"
                    />
                    <span className="font-semibold text-slate-800">Simple Product (No Variants)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="productType"
                      checked={hasVariants}
                      onChange={() => setHasVariants(true)}
                      className="text-sky-600"
                    />
                    <span className="font-semibold text-purple-700">Variable Product (Has Variants)</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Short Description</label>
              <textarea
                rows={2}
                placeholder="Brief summary for listings..."
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Description</label>
              <textarea
                rows={4}
                placeholder="Complete product details and specification..."
                value={longDescription}
                onChange={(e) => setLongDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Shipping Weight (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.25"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value !== '' ? parseFloat(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Sort Order</label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center gap-6 pt-5">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-sky-600"
                  />
                  <span>Published & Active</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-semibold text-amber-700">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="rounded text-amber-600"
                  />
                  <span>Promoted / Featured</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Brand & Categories */}
        {activeTab === 'taxonomy' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-xs">
            <div>
              <label className="block font-bold text-slate-800 text-sm mb-2">Select Product Brand</label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="w-full max-w-md px-3 py-2.5 border border-slate-300 rounded-xl text-xs bg-white"
              >
                <option value="">-- No Brand Assigned --</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <label className="block font-bold text-slate-800 text-sm mb-1">Product Categories</label>
              <p className="text-slate-400 mb-3">Attach product to one or many category paths</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-2 border border-slate-200 rounded-xl">
                {categories.map((c) => {
                  const isSelected = categoryIds.includes(c.id);
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => toggleCategory(c.id)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-sky-50 border-sky-300 text-sky-800 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div>
                        <span className="block">{c.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">/{c.slug}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-sky-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Media Gallery & Thumbnail Rules */}
        {activeTab === 'media' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Product Media Gallery</h3>
                <p className="text-slate-400">Select exactly one primary thumbnail image and reorder carousel assets</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTargetVariantIndexForMedia(null);
                  setShowMediaPicker(true);
                }}
                className="px-4 py-2 bg-sky-600 text-white rounded-xl font-semibold flex items-center gap-1.5 shadow-md shadow-sky-600/20"
              >
                <Plus className="w-4 h-4" /> Attach Media from Library
              </button>
            </div>

            {/* Attached Media Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {attachedMedia.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  No media attached to product yet. Click above to attach from Shared Media Library.
                </div>
              ) : (
                attachedMedia.map((m, idx) => {
                  const isPrimary = m.mediaId === primaryThumbnailMediaId;
                  return (
                    <div
                      key={m.mediaId}
                      className={`bg-slate-50 rounded-xl border overflow-hidden relative flex flex-col justify-between ${
                        isPrimary ? 'ring-2 ring-sky-500 border-sky-500' : 'border-slate-200'
                      }`}
                    >
                      <div className="h-36 bg-slate-100 relative flex items-center justify-center">
                        <img src={m.publicUrl} alt={m.title} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeAttachedMedia(m.mediaId)}
                          className="absolute top-2 right-2 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700 shadow"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="p-3 bg-white space-y-2">
                        <p className="font-semibold text-slate-800 truncate text-[11px]">{m.title}</p>
                        <button
                          type="button"
                          onClick={() => setPrimaryThumbnail(m.mediaId)}
                          className={`w-full py-1 rounded text-[10px] font-semibold flex items-center justify-center gap-1 ${
                            isPrimary
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <Star className={`w-3 h-3 ${isPrimary ? 'fill-amber-500 text-amber-500' : ''}`} />
                          <span>{isPrimary ? 'Primary Thumbnail' : 'Set as Thumbnail'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Pricing & Stock (Simple) OR Variants Generator (Variable) */}
        {activeTab === 'pricingOrVariants' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-xs">
            {!hasVariants ? (
              /* Simple Product Pricing & Stock */
              <div className="space-y-4 max-w-xl">
                <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">Simple Product Figures</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Regular Price ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="49.99"
                      value={price}
                      onChange={(e) => setPrice(e.target.value !== '' ? parseFloat(e.target.value) : '')}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Sale Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="39.99"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value !== '' ? parseFloat(e.target.value) : '')}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-rose-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stock Count (Units) *</label>
                  <input
                    type="number"
                    required
                    placeholder="150"
                    value={stock}
                    onChange={(e) => setStock(e.target.value !== '' ? parseInt(e.target.value, 10) : '')}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>
            ) : (
              /* Variable Product Variants Generator & Matrix */
              <div className="space-y-6">
                <div className="bg-purple-50/70 p-4 rounded-xl border border-purple-200 space-y-3">
                  <h3 className="font-bold text-purple-900 text-sm">Variant Combination Generator</h3>
                  <p className="text-slate-600">Select participating attributes & values to produce variant combinations</p>

                  <div className="space-y-3 pt-2">
                    {attributes.map((attr) => {
                      const isAttrSelected = selectedAttributeIds.includes(attr.id);
                      return (
                        <div key={attr.id} className="bg-white p-3 rounded-lg border border-purple-100 space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                            <input
                              type="checkbox"
                              checked={isAttrSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAttributeIds([...selectedAttributeIds, attr.id]);
                                } else {
                                  setSelectedAttributeIds(selectedAttributeIds.filter((id) => id !== attr.id));
                                }
                              }}
                              className="rounded text-purple-600"
                            />
                            <span>{attr.name} ({attr.type})</span>
                          </label>

                          {isAttrSelected && (
                            <div className="flex flex-wrap gap-2 pl-6">
                              {attr.values?.map((v: any) => {
                                const currentSelected = selectedAttrValueIds[attr.id] || [];
                                const isValChecked = currentSelected.includes(v.id);
                                return (
                                  <label
                                    key={v.id}
                                    className={`px-2.5 py-1 rounded border text-[11px] cursor-pointer font-medium ${
                                      isValChecked
                                        ? 'bg-purple-600 text-white border-purple-600'
                                        : 'bg-slate-50 text-slate-700 border-slate-200'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      hidden
                                      checked={isValChecked}
                                      onChange={(e) => {
                                        const updated = e.target.checked
                                          ? [...currentSelected, v.id]
                                          : currentSelected.filter((id) => id !== v.id);
                                        setSelectedAttrValueIds({
                                          ...selectedAttrValueIds,
                                          [attr.id]: updated,
                                        });
                                      }}
                                    />
                                    <span>{v.value}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={generateVariantMatrix}
                    className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-xl font-semibold shadow-md shadow-purple-600/20"
                  >
                    Generate Combination Matrix
                  </button>
                </div>

                {/* Generated Variant Rows Table */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 text-sm">Product Variants ({variants.length})</h4>

                  <div className="space-y-3">
                    {variants.map((v, idx) => (
                      <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                        <div className="md:col-span-1">
                          <span className="font-bold text-slate-800 block text-xs">{v.comboLabel || `Variant ${idx + 1}`}</span>
                          <span className="text-[10px] text-slate-400 font-mono">SKU:</span>
                          <input
                            type="text"
                            value={v.sku}
                            onChange={(e) => updateVariantField(idx, 'sku', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-[11px]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500">Price ($) *</label>
                          <input
                            type="number"
                            step="0.01"
                            value={v.price}
                            onChange={(e) => updateVariantField(idx, 'price', parseFloat(e.target.value))}
                            className="w-full px-2 py-1 border border-slate-300 rounded font-semibold text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500">Sale Price ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={v.salePrice}
                            onChange={(e) => updateVariantField(idx, 'salePrice', e.target.value !== '' ? parseFloat(e.target.value) : '')}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-rose-600 font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500">Stock Count *</label>
                          <input
                            type="number"
                            value={v.stock}
                            onChange={(e) => updateVariantField(idx, 'stock', parseInt(e.target.value, 10))}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-semibold"
                          />
                        </div>

                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => removeVariant(idx)}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                            title="Remove Variant"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Shared Media Picker Modal */}
      {showMediaPicker && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Select Image from Shared Media Library</h3>
              <button onClick={() => setShowMediaPicker(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 gap-3 p-2 custom-scrollbar">
              {mediaLibrary.map((m) => (
                <div
                  key={m.id}
                  onClick={() => attachMediaAsset(m)}
                  className="h-28 rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:ring-2 hover:ring-sky-500 transition-all relative group"
                >
                  <img src={m.thumbnail || m.publicUrl} alt={m.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs">
                    Attach
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
