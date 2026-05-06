import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client"; 
import { useCart } from "../context/CartContext.jsx"; 
import { useWishlist } from "../context/WishlistContext.jsx"; 
import { useAuth } from "../context/AuthContext.jsx";
import { formatRON } from "../utils/money"; 
import SEO from "../components/SEO";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"; 

export default function Shop() {
  const { addItem } = useCart(); 
  const { toggleWishlist, isFavorite } = useWishlist(); 
  const { user, accessToken } = useAuth(); 
  
  const [pcs, setPcs] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  const [availableCases, setAvailableCases] = useState([]);

  const [customSelections, setCustomSelections] = useState({});

  const [filterCpu, setFilterCpu] = useState("Toate"); 
  const [filterGpu, setFilterGpu] = useState("Toate"); 
  const [maxPrice, setMaxPrice] = useState(3000000); 
  const [sortOrder, setSortOrder] = useState("default"); 

  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);

  const [isReordering, setIsReordering] = useState(false);
  const [reorderList, setReorderList] = useState([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const [compareList, setCompareList] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  
  const specRefs = useRef([]);

  // URL valid conform setărilor tale
  const getImageUrl = (img) => {
    if (!img) return "https://placehold.co/600x400/0b1020/ffffff?text=Karix+PC";
    if (img.startsWith("http")) return img;
    return `https://karixcomputers.ro/api/uploads/${img}`; 
  };

  useEffect(() => {
    if (showCompareModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showCompareModal]);

  const minAvailablePrice = useMemo(() => {
    if (pcs.length === 0) return 0;
    return Math.min(...pcs.map(p => p.priceCents || 0));
  }, [pcs]);

  const maxAvailablePrice = useMemo(() => {
    if (pcs.length === 0) return 3000000;
    return Math.max(...pcs.map(p => p.priceCents || 0));
  }, [pcs]);

  useEffect(() => {
    if (maxAvailablePrice > 0) setMaxPrice(maxAvailablePrice);
  }, [maxAvailablePrice]);

  const fetchCasesAndPcs = async () => {
    try {
      const casesRes = await apiFetch("/adminconfigurator");
      let fetchedCases = [];
      if (casesRes.ok) {
        const items = await casesRes.json();
        fetchedCases = items
          .filter(item => item.category === 'case')
          .sort((a, b) => a.name.localeCompare(b.name)); 
        setAvailableCases(fetchedCases);
      }

      const pcRes = await apiFetch("/products");
      if (pcRes.ok) {
        const data = await pcRes.json();
        const onlyPcs = data.filter(p => 
          p.category !== "service" &&
          p.isVisible !== false && 
          !p.name.toLowerCase().includes("mentenanta") && 
          !p.name.toLowerCase().includes("diagnosticare") &&
          !p.name.toLowerCase().includes("service")
        );
        setPcs(onlyPcs);
        
        const initialSelections = {};
        onlyPcs.forEach(pc => {
            let defaultCaseId = null;
            
            // Parsare robustă pentru compatibilități
            let compatArray = [];
            try {
               compatArray = Array.isArray(pc.compatibleCases) ? pc.compatibleCases : JSON.parse(pc.compatibleCases || "[]");
            } catch(e) { compatArray = []; }

            if (compatArray.length > 0) {
                const firstValidCase = fetchedCases.find(c => 
                    compatArray.some(compatId => String(compatId).trim() === String(c.id).trim())
                );
                if(firstValidCase) defaultCaseId = firstValidCase.id;
            }

            const baseStorage = pc.storageGb || "1TB";

            initialSelections[pc.id] = { 
                storage: baseStorage, 
                caseId: defaultCaseId
            };
        });
        setCustomSelections(initialSelections);
      }
    } catch (err) {
      console.error("Eroare la încărcarea datelor:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCasesAndPcs();
  }, []);

  const filteredAndSortedPcs = useMemo(() => {
    let result = [...pcs];

    if (filterCpu !== "Toate") {
      result = result.filter(pc => {
        const cpuText = (pc.cpuBrand || "").toLowerCase();
        if (filterCpu === "Intel") {
          return cpuText.includes("intel") || cpuText.includes("i3") || cpuText.includes("i5") || cpuText.includes("i7") || cpuText.includes("i9");
        }
        if (filterCpu === "AMD") {
          return cpuText.includes("amd") || cpuText.includes("ryzen");
        }
        if (filterCpu === "Intel i5") return cpuText.includes("i5");
        if (filterCpu === "Intel i7") return cpuText.includes("i7");
        if (filterCpu === "Intel i9") return cpuText.includes("i9");
        if (filterCpu === "Ryzen 5") return cpuText.includes("ryzen 5") || cpuText.includes("r5") || cpuText.includes("ryzen5");
        if (filterCpu === "Ryzen 7") return cpuText.includes("ryzen 7") || cpuText.includes("r7") || cpuText.includes("ryzen7");
        if (filterCpu === "Ryzen 9") return cpuText.includes("ryzen 9") || cpuText.includes("r9") || cpuText.includes("ryzen9");
        return cpuText.includes(filterCpu.toLowerCase());
      });
    }

    if (filterGpu !== "Toate") {
      result = result.filter(pc => {
        const gpuText = (pc.gpuBrand || "").toLowerCase();
        if (filterGpu === "NVIDIA") {
          const nvidiaModels = ["nvidia", "rtx", "gtx", "4050", "4060", "4070", "4080", "4090", "5060", "5070", "5080", "5090"];
          return nvidiaModels.some(model => gpuText.includes(model));
        }
        if (filterGpu === "AMD") {
          return gpuText.includes("amd") || gpuText.includes("radeon") || gpuText.includes("rx");
        }
        return gpuText.includes(filterGpu.toLowerCase());
      });
    }

    result = result.filter(pc => (pc.priceCents || 0) <= maxPrice);

    if (sortOrder === "asc") {
      result.sort((a, b) => (a.priceCents || 0) - (b.priceCents || 0));
    } else if (sortOrder === "desc") {
      result.sort((a, b) => (b.priceCents || 0) - (a.priceCents || 0));
    }

    return result;
  }, [pcs, filterCpu, filterGpu, maxPrice, sortOrder]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(reorderList);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setReorderList(items);
  };

  const toggleReorderMode = () => {
    if (!isReordering) {
      setFilterCpu("Toate");
      setFilterGpu("Toate");
      setMaxPrice(maxAvailablePrice);
      setSortOrder("default");
      setReorderList([...pcs]); 
    }
    setIsReordering(!isReordering);
  };

  const saveNewOrder = async () => {
    setIsSavingOrder(true);
    const updatedItems = reorderList.map((item, index) => ({
      id: item.id,
      sortOrder: index
    }));

    try {
      const res = await fetch("https://api.karixcomputers.ro/api/products/reorder", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({ items: updatedItems })
      });

      if (res.ok) {
        const toastId = Date.now();
        setToasts((prev) => [...prev, { id: toastId, message: "Ordinea a fost salvată cu succes!" }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== toastId)), 3000);
        setIsReordering(false);
        fetchCasesAndPcs(); 
      } else {
        const data = await res.json();
        throw new Error(data.error || "Eroare la salvare.");
      }
    } catch (err) {
      alert("A apărut o eroare: " + err.message);
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleAddToCart = (pc, currentPriceCents, finalStorage, finalCase, displayImg) => {
    const success = addItem({
      id: pc.id,
      name: pc.name,
      category: pc.category,
      priceCents: currentPriceCents, 
      warrantyMonths: pc.warrantyMonths || 24,
      image: getImageUrl(displayImg), 
      specs: {
        cpu: pc.cpuBrand,
        gpu: pc.gpuBrand,
        ram: pc.ramGb, 
        storage: finalStorage, 
        motherboard: pc.motherboard, 
        case: finalCase,               
        cooler: pc.cooler,
        psu: pc.psu
      }
    });

    if (success === false) return;

    const toastId = Date.now();
    setToasts((prev) => [...prev, { id: toastId, message: `Sistemul "${pc.name}" a fost adăugat!` }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 3000);
  };

  const selectSort = (value) => {
    setSortOrder(value);
    setShowSort(false);
  };

  const toggleCompare = (pc) => {
    if (compareList.find(c => c.id === pc.id)) {
      setCompareList(prev => prev.filter(c => c.id !== pc.id));
    } else {
      if (compareList.length >= 3) {
        const toastId = Date.now();
        setToasts(prev => [...prev, { id: toastId, message: "Poți compara maxim 3 sisteme simultan!" }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== toastId)), 3000);
        return;
      }
      setCompareList(prev => [...prev, pc]);
    }
  };

  const handleSyncScroll = (e) => {
    const top = e.currentTarget.scrollTop;
    specRefs.current.forEach(ref => {
      if (ref && ref !== e.currentTarget && ref.scrollTop !== top) {
        ref.scrollTop = top;
      }
    });
  };

  const renderCompareSpec = (icon, label, val) => (
    <div className="flex items-start gap-3 bg-black/20 p-3 rounded-2xl border border-white/5 shrink-0">
      <span className="text-base grayscale brightness-200 pt-0.5 shrink-0">{icon}</span>
      <div className="flex flex-col">
        <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">{label}</span>
        <span className="text-xs text-white font-bold italic leading-tight">{val || 'N/A'}</span>
      </div>
    </div>
  );

  const updateSelection = (pcId, type, val) => {
      setCustomSelections(prev => ({
          ...prev,
          [pcId]: { ...prev[pcId], [type]: val }
      }));
  };

  const getStorageOptions = (baseStorage) => {
      const base = baseStorage || "1TB";
      const storageList = [
          { value: "512GB", label: "512 GB NVMe M.2", cost: 0 },
          { value: "1TB", label: "1 TB NVMe M.2", cost: 250 },
          { value: "2TB", label: "2 TB NVMe M.2", cost: 750 },
          { value: "4TB", label: "4 TB NVMe M.2", cost: 2000 }
      ];

      const baseItem = storageList.find(s => s.value === base) || storageList[1];
      const baseCost = baseItem.cost;

      return storageList
          .filter(s => s.cost >= baseCost)
          .map(s => {
              const diff = s.cost - baseCost;
              return {
                  value: s.value,
                  label: s.value === base ? `${s.label} (Bază)` : `${s.label} (Upgrade)`,
                  extraCents: diff * 100, 
                  extraText: diff > 0 ? `+${diff} RON` : "" 
              };
          });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-transparent">
      <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <>
      <SEO 
        title="Sisteme Gaming & Workstations Premium" 
        description="Explorează catalogul Karix Computers. Build-uri PC performante, configurate manual și testate pentru gaming de elită sau productivitate profesională în Oradea."
      />

      <div className="min-h-screen pt-32 pb-24 px-4 relative overflow-hidden bg-transparent text-left font-sans text-white">
        <style>{`
          @keyframes slideIn {
            from { opacity: 0; transform: translateX(100%) scale(0.9); }
            to { opacity: 1; transform: translateX(0) scale(1); }
          }
          .toast-card { animation: slideIn 0.3s cubic-bezier(0.17, 0.67, 0.83, 0.67) forwards; }
          
          .custom-scrollbar::-webkit-scrollbar {
            height: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(99, 102, 241, 0.5);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(99, 102, 241, 0.8);
          }
        `}</style>


        <div className="max-w-6xl mx-auto relative z-10">
          
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
            <div className="max-w-xl">
              <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tighter leading-tight uppercase italic drop-shadow-2xl">
                Sisteme <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">Karix </span>
              </h1>
              <p className="text-gray-300 text-base md:text-lg font-medium italic drop-shadow-md">Configurații custom cu componente de ultimă generație.</p>
            </div>

            <div className="flex flex-wrap items-center gap-4 relative">
              
              {user?.role === "admin" && (
                <button 
                  onClick={toggleReorderMode}
                  className={`px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg flex items-center gap-2 ${isReordering ? 'bg-amber-500 text-black shadow-amber-500/20' : 'bg-indigo-600 text-white shadow-indigo-600/20'}`}
                >
                  <span>{isReordering ? "✕ Anulează Editarea" : "✏️ Editează Ordinea"}</span>
                </button>
              )}

              {!isReordering && (
                <>
                  <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg flex items-center gap-2 ${showFilters ? 'bg-indigo-600 text-white' : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'}`}
                  >
                    <span>⚙️ Filtre</span>
                  </button>

                  <div className="relative">
                    <button 
                      onClick={() => setShowSort(!showSort)}
                      className={`px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg flex items-center gap-2 ${showSort ? 'bg-pink-600 text-white' : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'}`}
                    >
                      <span>⇅ Ordonare</span>
                    </button>
                    
                    {showSort && (
                      <div className="absolute right-0 top-14 w-48 bg-[#0b1020]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                        <button onClick={() => selectSort("default")} className={`w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-colors ${sortOrder === 'default' ? 'text-pink-400 bg-white/5' : 'text-gray-400'}`}>Recomandate</button>
                        <div className="h-px bg-white/5" />
                        <button onClick={() => selectSort("asc")} className={`w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-colors ${sortOrder === 'asc' ? 'text-pink-400 bg-white/5' : 'text-gray-400'}`}>Preț: Crescător</button>
                        <div className="h-px bg-white/5" />
                        <button onClick={() => selectSort("desc")} className={`w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-colors ${sortOrder === 'desc' ? 'text-pink-400 bg-white/5' : 'text-gray-400'}`}>Preț: Descrescător</button>
                      </div>
                    )}
                  </div>
                </>
              )}

            </div>
          </header>

          {showFilters && !isReordering && (
            <div className="mb-12 p-8 rounded-[35px] bg-[#0b1020]/60 border border-white/10 backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-top-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] italic">Procesor (CPU)</label>
                  <select 
                    value={filterCpu} 
                    onChange={(e) => setFilterCpu(e.target.value)}
                    className="bg-white/5 border border-white/10 text-white text-xs font-bold p-4 rounded-2xl outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
                  >
                    <option value="Toate" className="bg-[#0b1020] text-white">Toate Procesoarele</option>
                    <optgroup label="Intel" className="bg-[#0b1020] text-indigo-400">
                      <option value="Intel" className="text-white">Orice Intel</option>
                      <option value="Intel i5" className="text-white">Intel Core i5</option>
                      <option value="Intel i7" className="text-white">Intel Core i7</option>
                      <option value="Intel i9" className="text-white">Intel Core i9</option>
                    </optgroup>
                    <optgroup label="AMD" className="bg-[#0b1020] text-pink-400">
                      <option value="AMD" className="text-white">Orice AMD</option>
                      <option value="Ryzen 5" className="text-white">AMD Ryzen 5</option>
                      <option value="Ryzen 7" className="text-white">AMD Ryzen 7</option>
                      <option value="Ryzen 9" className="text-white">AMD Ryzen 9</option>
                    </optgroup>
                  </select>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] italic">Placă Video (GPU)</label>
                  <select 
                    value={filterGpu} 
                    onChange={(e) => setFilterGpu(e.target.value)}
                    className="bg-white/5 border border-white/10 text-white text-xs font-bold p-4 rounded-2xl outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
                  >
                    <option value="Toate" className="bg-[#0b1020] text-white">Toate Plăcile Video</option>
                    <option value="NVIDIA" className="bg-[#0b1020] text-white">NVIDIA GeForce</option>
                    <option value="AMD" className="bg-[#0b1020] text-white">AMD Radeon</option>
                  </select>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] italic">Buget Maxim</label>
                    <span className="text-sm font-black text-white italic">{formatRON(maxPrice)}</span>
                  </div>
                  <div className="pt-2">
                    <input 
                      type="range" 
                      min={minAvailablePrice} 
                      max={maxAvailablePrice} 
                      step="10000" 
                      value={maxPrice} 
                      onChange={(e) => setMaxPrice(Number(e.target.value))}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pink-500 hover:accent-pink-400 transition-all"
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-gray-500 font-black tracking-widest mt-1">
                    <span>{formatRON(minAvailablePrice)}</span>
                    <span>Max</span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {isReordering ? (
            
            <div className="bg-[#12192b] border border-white/10 p-8 rounded-[40px] shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black text-amber-400 italic uppercase">Reordonare Produse</h2>
                  <p className="text-xs text-gray-400 font-medium">Trage produsele în sus sau în jos pentru a schimba ordinea pe site.</p>
                </div>
                <button 
                  onClick={saveNewOrder} 
                  disabled={isSavingOrder}
                  className="px-8 py-4 rounded-2xl bg-amber-500 text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-amber-500/20 hover:bg-amber-400 disabled:opacity-50 transition-all"
                >
                  {isSavingOrder ? "Se salvează..." : "✓ Salvează Ordinea"}
                </button>
              </div>

              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="products-list">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="flex flex-col gap-4">
                      {reorderList.map((pc, index) => (
                        <Draggable key={pc.id} draggableId={pc.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={provided.draggableProps.style} 
                              className={`flex items-center gap-6 p-4 rounded-2xl border transition-all ${snapshot.isDragging ? 'bg-amber-500/20 border-amber-500 shadow-2xl scale-[1.02]' : 'bg-[#0b1020] border-white/10 hover:border-white/30'}`}
                            >
                              <div className="text-gray-500 text-2xl cursor-grab active:cursor-grabbing px-2">≡</div>
                              <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center font-black text-white/50">{index + 1}</div>
                              <img src={getImageUrl(pc.images?.[0])} alt="" className="w-16 h-16 rounded-xl object-contain p-2 bg-white/5" />
                              <div className="flex-1">
                                <h3 className="font-bold text-white uppercase italic tracking-tight">{pc.name}</h3>
                                <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">{formatRON(pc.priceCents)}</p>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>

          ) : (
            
            filteredAndSortedPcs.length === 0 ? (
              <div className="text-center py-24 border border-white/5 rounded-[40px] bg-white/5 backdrop-blur-md shadow-2xl">
                <p className="text-gray-400 font-black italic uppercase tracking-[0.2em] text-sm">Nu am găsit sisteme cu aceste specificații.</p>
                <button onClick={() => { setFilterCpu("Toate"); setFilterGpu("Toate"); setMaxPrice(maxAvailablePrice); }} className="mt-6 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white text-[10px] font-black uppercase tracking-widest transition-all">
                  Resetează Filtrele
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredAndSortedPcs.map((pc) => {
                  const isCompared = compareList.find(c => c.id === pc.id);
                  
                  const dynamicStorageOptions = getStorageOptions(pc.storageGb);
                  const selectedStorage = customSelections[pc.id]?.storage || pc.storageGb || "1TB";
                  
                  const currentStorageOption = dynamicStorageOptions.find(opt => opt.value === selectedStorage);
                  const storageAddedPriceCents = currentStorageOption ? currentStorageOption.extraCents : 0;
                  
                  // Parsare si filtrare robustă carcase compatibile
                  let compatArray = [];
                  try {
                     compatArray = Array.isArray(pc.compatibleCases) ? pc.compatibleCases : JSON.parse(pc.compatibleCases || "[]");
                  } catch(e) { compatArray = []; }

                  const pcCompatibleCases = availableCases.filter(c => 
                    compatArray.some(compatId => String(compatId).trim() === String(c.id).trim())
                  );

                  // Determinăm ID-ul selectat
                  const selectedCaseId = customSelections[pc.id]?.caseId || (pcCompatibleCases.length > 0 ? pcCompatibleCases[0].id : null);

                  // Găsim obiectul carcasei
                  const selectedCaseObj = pcCompatibleCases.find(c => String(c.id).trim() === String(selectedCaseId).trim());

                  // Alegem imaginea dinamică
                  const displayImage = (selectedCaseObj && selectedCaseObj.image) 
                    ? selectedCaseObj.image 
                    : pc.images?.[0];

                  // Calculăm prețul suplimentar
                  const caseAddedPriceCents = selectedCaseObj?.price || 0;

                  const currentPriceCents = (pc.priceCents || 0) + storageAddedPriceCents + caseAddedPriceCents;

                  const finalStorageText = currentStorageOption ? currentStorageOption.label : selectedStorage;

                  let finalCaseText = pc.case || "N/A";
                  if (selectedCaseObj) finalCaseText = selectedCaseObj.name;

                  return (
                  <div key={pc.id} className="flex flex-col rounded-[35px] bg-white/5 border border-white/10 overflow-hidden group hover:border-indigo-500/40 transition-all duration-500 backdrop-blur-md shadow-2xl relative">
                    
                    <div className="relative h-64 overflow-hidden bg-black/20 shrink-0">
                      {/* 👉 FIX AICI: am adăugat "items-start" pentru a micșora lățimea etichetei de 24 luni */}
                      <div className="absolute top-5 left-5 z-20 flex flex-col items-start gap-2">
                        <div className="group/badge relative">
                            <span className="px-3 py-1.5 rounded-xl bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest shadow-xl cursor-help block">
                                Asamblat la Comandă
                            </span>
                            <div className="absolute top-full left-0 mt-2 w-48 p-2 bg-[#0b1020] text-gray-300 text-[9px] border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover/badge:opacity-100 group-hover/badge:visible transition-all z-30">
                                Sistem asamblat la comandă, produs personalizat ce nu se supune returului în 14 zile cf. OUG 34/2014, art.16, lit. c.
                            </div>
                        </div>

                        <span className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-widest border border-white/10">
                          🛡️ {pc.warrantyMonths || 24} Luni
                        </span>
                      </div>

                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          toggleWishlist(pc.id);
                        }}
                        className={`absolute top-5 right-5 z-30 h-10 w-10 rounded-xl backdrop-blur-xl border flex items-center justify-center transition-all duration-300 shadow-2xl active:scale-90 ${
                          isFavorite(pc.id) 
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' 
                            : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <span className="text-lg leading-none transition-transform duration-300 group-active:scale-125">
                          {isFavorite(pc.id) ? '❤️' : '🤍'}
                        </span>
                      </button>

                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          toggleCompare(pc);
                        }}
                        className={`absolute top-16 right-5 z-30 h-10 w-10 rounded-xl backdrop-blur-xl border flex items-center justify-center transition-all duration-300 shadow-2xl active:scale-90 ${
                          isCompared
                            ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' 
                            : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'
                        }`}
                        title="Adaugă la Comparare"
                      >
                        <span className="text-lg leading-none transition-transform duration-300 group-active:scale-125">
                          ⚖️
                        </span>
                      </button>

                      {/* 👉 FIX AICI: am folosit object-contain, p-6 și pt-10 pentru a nu încăleca etichetele */}
                      <img 
                        key={displayImage}
                        src={getImageUrl(displayImage)} 
                        alt={pc.name} 
                        className="w-full h-full object-contain p-6 pt-10 transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100 animate-in zoom-in-95" 
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0b1020] via-black/40 to-transparent opacity-90 pointer-events-none" />
                    </div>

                    <div className="p-8 flex-1 flex flex-col">
                      <div className="mb-6 relative z-10 -mt-12">
                        <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2 drop-shadow-md">{pc.cpuBrand?.split(' ')[0] || 'Custom'} Edition</p>
                        <h3 className="text-2xl font-black text-white tracking-tight italic uppercase drop-shadow-2xl">{pc.name}</h3>
                      </div>

                      {/* --- AICI SUNT TOATE CELE 6 COMPONENTE --- */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-4 mb-6">
                        <div className="flex items-center gap-3">
                          <span className="text-indigo-400 text-base">⚡</span>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest">CPU</span>
                            <span className="font-bold text-white/90 whitespace-normal break-words text-[11px] leading-tight">{pc.cpuBrand || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-indigo-400 text-base">🎮</span>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest">GPU</span>
                            <span className="font-bold text-white/90 whitespace-normal break-words text-[11px] leading-tight">{pc.gpuBrand || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-indigo-400 text-base">📟</span>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest">RAM</span>
                            <span className="font-bold text-white/90 whitespace-normal break-words text-[11px] leading-tight">{pc.ramGb || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-indigo-400 text-base">🧩</span>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest">Placă Bază</span>
                            <span className="font-bold text-white/90 whitespace-normal break-words text-[11px] leading-tight">{pc.motherboard || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-indigo-400 text-base">❄️</span>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest">Cooler</span>
                            <span className="font-bold text-white/90 whitespace-normal break-words text-[11px] leading-tight">{pc.cooler || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-indigo-400 text-base">🔌</span>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest">Sursă</span>
                            <span className="font-bold text-white/90 whitespace-normal break-words text-[11px] leading-tight">{pc.psu || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 mb-6 mt-4">
                        {/* Selector Carcase */}
                        {pcCompatibleCases.length > 0 && (
                          <div className="flex flex-col">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5 ml-1 flex items-center gap-1.5">
                              <span className="text-indigo-400 text-[10px]">📦</span> Alege Carcasa
                            </label>
                            <div className="relative">
                              <select 
                                value={selectedCaseId || ''} 
                                onChange={(e) => updateSelection(pc.id, 'caseId', e.target.value)}
                                className="w-full appearance-none bg-[#0b1020] border border-white/10 text-white text-[11px] font-bold py-3 pl-4 pr-10 rounded-xl outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                              >
                                {pcCompatibleCases.map(caseOpt => (
                                  <option key={caseOpt.id} value={caseOpt.id}>
                                    {caseOpt.name} {caseOpt.price > 0 ? `(+${formatRON(caseOpt.price)})` : ''}
                                  </option>
                                ))}
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                              </div>
                            </div>
                          </div>
                        )}

                        {dynamicStorageOptions.length > 0 && (
                          <div className="flex flex-col">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5 ml-1 flex items-center gap-1.5">
                              <span className="text-indigo-400 text-[10px]">💾</span> Memorie Stocare
                            </label>
                            <div className="relative">
                              <select 
                                value={selectedStorage} 
                                onChange={(e) => updateSelection(pc.id, 'storage', e.target.value)}
                                className="w-full appearance-none bg-[#0b1020] border border-white/10 text-white text-[11px] font-bold py-3 pl-4 pr-10 rounded-xl outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                              >
                                {dynamicStorageOptions.map(option => (
                                  <option key={option.value} value={option.value}>
                                    {option.label} {option.extraText ? `(${option.extraText})` : ''}
                                  </option>
                                ))}
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-auto pt-6 border-t border-white/10 flex flex-col gap-4">
                        <div className="flex items-center justify-center"> 
                          <div className="flex flex-col items-center text-center"> 
                            <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">
                              Preț Sistem
                            </span>
                            <span className="text-2xl font-black text-white italic">
                              {formatRON(currentPriceCents)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Link 
                            to={`/product/${pc.id}`}
                            className="flex-1 h-12 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/20 transition-all flex items-center justify-center font-black uppercase text-[10px] tracking-widest active:scale-95 shadow-lg"
                          >
                            Detalii
                          </Link>
                          <button 
                            onClick={() => handleAddToCart(pc, currentPriceCents, finalStorageText, finalCaseText, displayImage)} 
                            className="flex-1 h-12 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-all flex items-center justify-center font-black uppercase text-[10px] tracking-widest active:scale-95 shadow-lg shadow-indigo-600/20"
                          >
                            Adaugă
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            )
          )}
        </div>

        {/* --- BARĂ PLUTITOARE COMPARARE --- */}
        {compareList.length > 0 && !isReordering && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-6 bg-[#0b1020]/95 backdrop-blur-2xl border border-indigo-500/30 p-4 rounded-[28px] shadow-[0_0_40px_rgba(99,102,241,0.2)] animate-in slide-in-from-bottom-10">
            <div className="flex -space-x-4 pl-2">
              {compareList.map(c => (
                <img key={c.id} src={getImageUrl(c.images?.[0])} alt="" className="w-12 h-12 rounded-full border-2 border-[#0b1020] object-cover bg-white/10" />
              ))}
            </div>
            <div className="hidden sm:block text-white pr-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{compareList.length} / 3 Sisteme</p>
              <p className="text-xs font-bold italic text-gray-300">Gata de comparare</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowCompareModal(true)} 
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95"
              >
                Compară Acum
              </button>
              <button 
                onClick={() => setCompareList([])} 
                className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 border border-white/10 hover:border-rose-500/30 rounded-2xl transition-all active:scale-95"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* --- MODAL FULLSCREEN COMPARARE --- */}
        {showCompareModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 md:p-10 backdrop-blur-md bg-black/60 animate-in fade-in duration-300">
            <div className="relative w-full max-w-7xl h-full max-h-[95vh] sm:max-h-[90vh] bg-[#0b1020]/95 border border-white/10 p-4 pt-12 sm:p-6 sm:pt-6 md:p-10 rounded-[24px] sm:rounded-[40px] shadow-2xl flex flex-col backdrop-blur-2xl">
              
              <button 
                onClick={() => setShowCompareModal(false)} 
                className="absolute top-4 right-4 sm:top-6 sm:right-6 h-8 w-8 sm:h-12 sm:w-12 flex items-center justify-center rounded-xl sm:rounded-2xl bg-white/5 text-gray-400 hover:text-white hover:bg-rose-500 hover:border-rose-500 border border-white/10 transition-all z-[210] text-lg sm:text-xl"
              >
                ✕
              </button>
              
              <h2 className="text-center text-2xl sm:text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter mb-4 sm:mb-8 drop-shadow-lg shrink-0 pr-8 sm:pr-0">
                Comparare <span className="text-indigo-400">Sisteme</span>
              </h2>
              
              <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 snap-x snap-mandatory flex-1 items-start md:justify-center no-scrollbar custom-scrollbar w-full touch-pan-x">
                {compareList.map((pc, index) => (
                  <div key={pc.id} className="min-w-[80%] sm:min-w-[300px] md:min-w-[350px] w-[80%] sm:w-[300px] md:w-[350px] shrink-0 h-full flex flex-col bg-white/[0.03] border border-white/10 rounded-[20px] sm:rounded-[30px] p-4 sm:p-6 snap-center hover:border-indigo-500/40 transition-colors shadow-2xl relative text-left">
                    
                    <button onClick={() => {
                      const newList = compareList.filter(c => c.id !== pc.id);
                      setCompareList(newList);
                      if (newList.length === 0) setShowCompareModal(false);
                    }} className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-500 hover:text-rose-500 h-8 w-8 rounded-full flex items-center justify-center hover:bg-rose-500/10 transition-colors z-20">
                      ✕
                    </button>

                    <img src={getImageUrl(pc.images?.[0])} alt="" className="w-full h-32 sm:h-40 object-contain rounded-2xl mb-4 drop-shadow-2xl shrink-0" />
                    
                    <div className="shrink-0 mb-4">
                      <p className="text-[9px] sm:text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] mb-1">{pc.cpuBrand?.split(' ')[0] || 'Custom'}</p>
                      <h3 className="text-xl sm:text-2xl font-black text-white italic uppercase tracking-tight leading-tight line-clamp-2 min-h-[3rem]">{pc.name}</h3>
                      <p className="text-xl sm:text-2xl font-black text-white drop-shadow-xl italic mt-2">{formatRON(pc.priceCents)}</p>
                    </div>
                    
                    <div 
                      ref={el => specRefs.current[index] = el}
                      onScroll={handleSyncScroll}
                      className="flex flex-col gap-3 flex-1 overflow-y-auto pr-2 no-scrollbar touch-pan-y"
                    >
                      {renderCompareSpec("⚡", "Procesor", pc.cpuBrand)}
                      {renderCompareSpec("🎮", "Placă Video", pc.gpuBrand)}
                      {renderCompareSpec("📟", "Memorie RAM", pc.ramGb)}
                      {renderCompareSpec("🧩", "Placă de Bază", pc.motherboard)}
                      {renderCompareSpec("💾", "Stocare", pc.storageGb)}
                      {renderCompareSpec("❄️", "Răcire", pc.cooler)}
                      {renderCompareSpec("🔌", "Sursă", pc.psu)}
                      {renderCompareSpec("📦", "Carcasă", pc.case)}
                    </div>
                    
                    <button 
                      onClick={() => { 
                        const dynamicStorageOptions = getStorageOptions(pc.storageGb);
                        const selectedStorage = customSelections[pc.id]?.storage || pc.storageGb || "1TB";
                        const currentStorageOption = dynamicStorageOptions.find(opt => opt.value === selectedStorage);
                        const storageAddedPriceCents = currentStorageOption ? currentStorageOption.extraCents : 0;
                        
                        let compatArray = [];
                        try {
                           compatArray = Array.isArray(pc.compatibleCases) ? pc.compatibleCases : JSON.parse(pc.compatibleCases || "[]");
                        } catch(e) { compatArray = []; }

                        const pcCompatibleCases = availableCases.filter(c => 
                            compatArray.some(compatId => String(compatId).trim() === String(c.id).trim())
                        );

                        const selectedCaseId = customSelections[pc.id]?.caseId || (pcCompatibleCases.length > 0 ? pcCompatibleCases[0].id : null);
                        
                        let caseAddedPriceCents = 0;
                        let selectedCaseObj = null;

                        if (selectedCaseId && pcCompatibleCases.length > 0) {
                            selectedCaseObj = pcCompatibleCases.find(c => String(c.id).trim() === String(selectedCaseId).trim());
                            if (selectedCaseObj) {
                                caseAddedPriceCents = selectedCaseObj.price || 0; 
                            } else {
                                selectedCaseObj = pcCompatibleCases[0];
                                caseAddedPriceCents = selectedCaseObj.price || 0;
                            }
                        }

                        const displayImg = (selectedCaseObj && selectedCaseObj.image) 
                          ? selectedCaseObj.image 
                          : pc.images?.[0];

                        const finalStorageText = currentStorageOption ? currentStorageOption.label : selectedStorage;
                        
                        let finalCaseText = pc.case || "N/A";
                        if (selectedCaseObj) finalCaseText = selectedCaseObj.name;

                        const currentPriceCents = (pc.priceCents || 0) + storageAddedPriceCents + caseAddedPriceCents;

                        handleAddToCart(pc, currentPriceCents, finalStorageText, finalCaseText, displayImg);
                        
                        setCompareList(compareList.filter(c => c.id !== pc.id));
                        if (compareList.length === 1) setShowCompareModal(false);
                      }} 
                      className="w-full py-3 sm:py-4 mt-4 sm:mt-6 bg-indigo-600 text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-[0.2em] text-[9px] sm:text-[10px] hover:bg-indigo-500 transition-all shadow-lg shrink-0 active:scale-95"
                    >
                      Adaugă în coș
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  ); 
}