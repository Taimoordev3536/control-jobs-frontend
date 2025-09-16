
'use client'

export function LoadingSpinner() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 bg-muted/50 rounded-full"></div>
          <div className="space-y-2">
            <div className="h-6 w-48 bg-muted/70 rounded"></div>
            <div className="h-4 w-60 bg-muted/40 rounded"></div>
          </div>
        </div>
        <div className="flex flex-col space-y-1">
          <div className="h-5 w-64 bg-muted/60 rounded"></div>
          <div className="h-4 w-52 bg-muted/40 rounded"></div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* TURNOS DE HOY */}
        <div className="h-24 bg-card border border-border/40 rounded-lg shadow-sm p-4 flex flex-col justify-between">
          <div className="h-4 w-32 bg-muted/40 rounded"></div>
          <div className="h-8 w-16 bg-muted/60 rounded"></div>
        </div>
        
        {/* TRABAJOS COMPLETADOS */}
        <div className="h-24 bg-card border border-border/40 rounded-lg shadow-sm p-4 flex flex-col justify-between">
          <div className="h-4 w-40 bg-muted/40 rounded"></div>
          <div className="h-8 w-16 bg-muted/60 rounded"></div>
        </div>
        
        {/* HORAS HOY */}
        <div className="h-24 bg-card border border-border/40 rounded-lg shadow-sm p-4 flex flex-col justify-between">
          <div className="h-4 w-24 bg-muted/40 rounded"></div>
          <div className="h-8 w-16 bg-muted/60 rounded"></div>
        </div>
        
        {/* TASA DE PUNTUALIDAD */}
        <div className="h-24 bg-card border border-border/40 rounded-lg shadow-sm p-4 flex flex-col justify-between">
          <div className="h-4 w-40 bg-muted/40 rounded"></div>
          <div className="h-8 w-16 bg-muted/60 rounded"></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-6 border-b border-border/30 pb-2">
        <div className="h-7 w-40 bg-muted/60 rounded"></div>
        <div className="h-7 w-40 bg-muted/40 rounded"></div>
        <div className="h-7 w-40 bg-muted/40 rounded"></div>
      </div>

      {/* Job Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* First Job Card - ELECTRICISTA */}
        <div className="p-4 bg-card border border-border rounded-xl shadow-sm space-y-4">
          {/* Title and Code */}
          <div className="flex justify-between items-start">
            <div className="h-6 w-32 bg-muted/70 rounded"></div>
            <div className="h-6 w-24 bg-muted/50 rounded"></div>
          </div>
          
          {/* Client & Location */}
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="h-4 w-16 bg-muted/40 rounded mb-1"></div>
              <div className="h-5 w-32 bg-muted/60 rounded"></div>
            </div>
            <div className="flex-1">
              <div className="h-4 w-20 bg-muted/40 rounded mb-1"></div>
              <div className="h-5 w-32 bg-muted/60 rounded"></div>
            </div>
          </div>
          
          {/* Date & Duration */}
          <div className="space-y-1">
            <div className="h-4 w-48 bg-muted/50 rounded"></div>
            <div className="h-4 w-32 bg-muted/50 rounded"></div>
          </div>
          
          {/* Hours & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="h-4 w-24 bg-muted/40 rounded mb-1"></div>
              <div className="h-5 w-16 bg-muted/60 rounded"></div>
            </div>
            <div>
              <div className="h-4 w-16 bg-muted/40 rounded mb-1"></div>
              <div className="h-5 w-28 bg-muted/60 rounded"></div>
            </div>
          </div>
          
          {/* Tasks */}
          <div className="space-y-1">
            <div className="h-4 w-40 bg-muted/40 rounded"></div>
            <div className="h-4 w-32 bg-muted/40 rounded"></div>
          </div>
          
          {/* Registration Methods */}
          <div>
            <div className="h-4 w-40 bg-muted/40 rounded mb-2"></div>
            <div className="flex space-x-3">
              <div className="h-10 flex-1 bg-muted/70 rounded-lg"></div>
              <div className="h-10 w-28 bg-muted/50 rounded-lg"></div>
            </div>
          </div>
        </div>
        
        {/* Second Job Card - Limpiador */}
        <div className="p-4 bg-card border border-border rounded-xl shadow-sm space-y-4">
          {/* Title and Code */}
          <div className="flex justify-between items-start">
            <div className="h-6 w-24 bg-muted/70 rounded"></div>
            <div className="h-6 w-24 bg-muted/50 rounded"></div>
          </div>
          
          {/* Client & Location */}
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="h-4 w-16 bg-muted/40 rounded mb-1"></div>
              <div className="h-5 w-32 bg-muted/60 rounded"></div>
            </div>
            <div className="flex-1">
              <div className="h-4 w-20 bg-muted/40 rounded mb-1"></div>
              <div className="h-5 w-32 bg-muted/60 rounded"></div>
            </div>
          </div>
          
          {/* Date & Duration */}
          <div className="space-y-1">
            <div className="h-4 w-48 bg-muted/50 rounded"></div>
            <div className="h-4 w-32 bg-muted/50 rounded"></div>
          </div>
          
          {/* Hours & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="h-4 w-24 bg-muted/40 rounded mb-1"></div>
              <div className="h-5 w-12 bg-muted/60 rounded"></div>
            </div>
            <div>
              <div className="h-4 w-16 bg-muted/40 rounded mb-1"></div>
              <div className="h-5 w-28 bg-muted/60 rounded"></div>
            </div>
          </div>
          
          {/* Tasks */}
          <div className="space-y-1">
            <div className="h-4 w-40 bg-muted/40 rounded"></div>
          </div>
          
          {/* Registration Methods */}
          <div>
            <div className="h-4 w-40 bg-muted/40 rounded mb-2"></div>
            <div className="flex space-x-3">
              <div className="h-10 flex-1 bg-muted/70 rounded-lg"></div>
              <div className="h-10 w-28 bg-muted/50 rounded-lg"></div>
            </div>
          </div>
        </div>
        
        {/* Third Job Card - Limpieza oficina */}
        <div className="p-4 bg-card border border-border rounded-xl shadow-sm space-y-4">
          {/* Title and Code */}
          <div className="flex justify-between items-start">
            <div className="h-6 w-32 bg-muted/70 rounded"></div>
            <div className="h-6 w-24 bg-muted/50 rounded"></div>
          </div>
          
          {/* Client & Location */}
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="h-4 w-16 bg-muted/40 rounded mb-1"></div>
              <div className="h-5 w-32 bg-muted/60 rounded"></div>
            </div>
            <div className="flex-1">
              <div className="h-4 w-20 bg-muted/40 rounded mb-1"></div>
              <div className="h-5 w-32 bg-muted/60 rounded"></div>
            </div>
          </div>
          
          {/* Date & Duration */}
          <div className="space-y-1">
            <div className="h-4 w-48 bg-muted/50 rounded"></div>
            <div className="h-4 w-24 bg-muted/50 rounded"></div>
          </div>
          
          {/* Hours & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="h-4 w-24 bg-muted/40 rounded mb-1"></div>
              <div className="h-5 w-12 bg-muted/60 rounded"></div>
            </div>
            <div>
              <div className="h-4 w-16 bg-muted/40 rounded mb-1"></div>
              <div className="h-5 w-28 bg-muted/60 rounded"></div>
            </div>
          </div>
          
          {/* Registration Methods */}
          <div>
            <div className="h-4 w-40 bg-muted/40 rounded mb-2"></div>
            <div className="flex space-x-3">
              <div className="h-10 flex-1 bg-muted/70 rounded-lg"></div>
              <div className="h-10 w-28 bg-muted/50 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}