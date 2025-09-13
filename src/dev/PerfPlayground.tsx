/**
 * Performance Playground for Board virtualization testing
 * Dev-only route for measuring virtual vs flat performance
 */

import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { 
  Play, 
  Download, 
  RefreshCw, 
  BarChart3, 
  Monitor,
  Zap,
  Database,
  Eye
} from 'lucide-react';
import { makeDataset, type DatasetSize } from './seed';
import { clearPerf, withMeasure, collectMeasures, perfMark } from '../lib/perf/timer';
import { createCounter } from '../lib/perf/counter';
import { nextFrame, FPSEstimator } from './raf';
import { featureManager } from '../config/features';
import { useBoardData } from '../features/board/useBoardData';
import { ClientRow } from '../features/board/components/ClientRow';
import { VirtualizedBoardList } from '../features/board/components/VirtualizedBoardList';

interface PerfResult {
  dataset: DatasetSize;
  virtualRows: boolean;
  mountTime: number;
  scrollFPS: number;
  rowMounts: number;
  overscanRenders: number;
  domNodeCount: number;
  memoryUsed?: number;
  timestamp: string;
}

interface PerfRun {
  id: string;
  results: PerfResult[];
  completed: boolean;
}

export function PerfPlayground() {
  const [selectedDataset, setSelectedDataset] = useState<DatasetSize>('1k');
  const [isRunning, setIsRunning] = useState(false);
  const [currentRun, setCurrentRun] = useState<PerfRun | null>(null);
  const [allRuns, setAllRuns] = useState<PerfRun[]>([]);
  const [testData, setTestData] = useState<any[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const rowMountCounter = useRef(createCounter('rowMounts'));
  const overscanCounter = useRef(createCounter('overscan'));

  // Generate test data
  const generateTestData = useCallback(() => {
    const data = makeDataset(selectedDataset);
    setTestData(data);
    console.log(`Generated ${data.length} test clients for dataset: ${selectedDataset}`);
  }, [selectedDataset]);

  // Run performance test
  const runPerfTest = useCallback(async (virtualRows: boolean): Promise<PerfResult> => {
    clearPerf();
    rowMountCounter.current.reset();
    overscanCounter.current.reset();
    
    // Mount measurement
    const { duration: mountTime } = await withMeasure('mount', async () => {
      // Simulate component mount
      await nextFrame();
    });

    // Scroll simulation
    const fpsEstimator = new FPSEstimator();
    fpsEstimator.start();
    
    if (containerRef.current) {
      const container = containerRef.current;
      const maxScroll = container.scrollHeight - container.clientHeight;
      const steps = 10;
      
      for (let i = 0; i <= steps; i++) {
        const scrollTop = (maxScroll * i) / steps;
        container.scrollTop = scrollTop;
        await nextFrame();
        await nextFrame(); // Extra frame for smooth scrolling
      }
    }
    
    const fpsResult = fpsEstimator.stop();

    // DOM node count
    const domNodeCount = containerRef.current?.querySelectorAll('*').length || 0;

    // Memory probe (if available)
    let memoryUsed: number | undefined;
    try {
      memoryUsed = (performance as any).memory?.usedJSHeapSize;
    } catch {
      // Not available in all browsers
    }

    return {
      dataset: selectedDataset,
      virtualRows,
      mountTime,
      scrollFPS: fpsResult.fps,
      rowMounts: rowMountCounter.current.get(),
      overscanRenders: overscanCounter.current.get(),
      domNodeCount,
      memoryUsed,
      timestamp: new Date().toISOString()
    };
  }, [selectedDataset]);

  // Run 3-pass comparison
  const runComparison = useCallback(async () => {
    if (!testData.length) {
      generateTestData();
      return;
    }

    setIsRunning(true);
    
    const runId = `run-${Date.now()}`;
    const newRun: PerfRun = {
      id: runId,
      results: [],
      completed: false
    };
    
    setCurrentRun(newRun);

    try {
      // Pass 1: Virtual OFF
      featureManager.setFeature('virtualRows', false);
      await nextFrame();
      const flatResult = await runPerfTest(false);
      newRun.results.push(flatResult);
      setCurrentRun({ ...newRun });

      // Pass 2: Virtual ON
      featureManager.setFeature('virtualRows', true);
      await nextFrame();
      const virtualResult = await runPerfTest(true);
      newRun.results.push(virtualResult);
      
      // Pass 3: Virtual OFF again (consistency check)
      featureManager.setFeature('virtualRows', false);
      await nextFrame();
      const flatResult2 = await runPerfTest(false);
      newRun.results.push(flatResult2);

      newRun.completed = true;
      setCurrentRun(newRun);
      setAllRuns(prev => [...prev, newRun]);
      
      console.log('Performance comparison completed:', newRun);
      
    } catch (error) {
      console.error('Performance test failed:', error);
    } finally {
      setIsRunning(false);
    }
  }, [testData, runPerfTest, generateTestData]);

  // Download results as JSON
  const downloadResults = useCallback((run: PerfRun) => {
    const json = JSON.stringify(run, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `perf-results-${run.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Calculate performance metrics
  const getMetrics = useCallback((result: PerfResult) => {
    const datasetCounts = { '100': 100, '1k': 1000, '5k': 5000, '10k': 10000 };
    const totalRows = datasetCounts[result.dataset];
    const domRowRatio = result.domNodeCount / totalRows;
    
    return {
      domRowRatio: domRowRatio.toFixed(3),
      mountTimeMs: result.mountTime.toFixed(1),
      scrollFPS: result.scrollFPS,
      memoryMB: result.memoryUsed ? (result.memoryUsed / 1024 / 1024).toFixed(1) : 'N/A'
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Performance Playground</h2>
        <Badge variant="warning" size="md">
          Development Only
        </Badge>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              Test Configuration
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Dataset Size</label>
                <select
                  value={selectedDataset}
                  onChange={(e) => setSelectedDataset(e.target.value as DatasetSize)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={isRunning}
                >
                  <option value="100">100 clients (smoke)</option>
                  <option value="1k">1,000 clients</option>
                  <option value="5k">5,000 clients</option>
                  <option value="10k">10,000 clients</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Current Data</label>
                <div className="text-sm text-gray-600">
                  {testData.length > 0 ? `${testData.length} clients loaded` : 'No data loaded'}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Virtual Rows</label>
                <div className="text-sm text-gray-600">
                  Currently: {featureManager.isEnabled('virtualRows') ? 'ON' : 'OFF'}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={generateTestData}
                disabled={isRunning}
                variant="secondary"
              >
                <Database className="w-4 h-4 mr-2" />
                Generate Test Data
              </Button>
              
              <Button
                onClick={runComparison}
                disabled={isRunning || testData.length === 0}
              >
                {isRunning ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {isRunning ? 'Running Tests...' : 'Run 3-Pass Comparison'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Container */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Test Container
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            ref={containerRef}
            className="border border-gray-200 rounded-lg overflow-auto"
            style={{ height: '400px' }}
          >
            {testData.length > 0 ? (
              featureManager.isEnabled('virtualRows') ? (
                <VirtualizedBoardList
                  clients={testData}
                  users={[]}
                  actions={{}}
                  selectedIds={new Set()}
                  onToggleSelect={() => {}}
                  rowHeight={44}
                />
              ) : (
                <div className="divide-y">
                  {testData.slice(0, 50).map((client, index) => (
                    <ClientRow
                      key={client.id}
                      client={client}
                      index={index}
                      users={[]}
                      actions={{}}
                      selected={false}
                      onToggleSelect={() => {}}
                    />
                  ))}
                  {testData.length > 50 && (
                    <div className="p-4 text-center text-gray-500">
                      ... and {testData.length - 50} more (showing first 50 in flat mode)
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="p-8 text-center text-gray-500">
                Generate test data to begin performance testing
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Run Progress */}
      {currentRun && (
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Current Run: {currentRun.id}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Progress: {currentRun.results.length}/3 passes completed
              </div>
              
              {currentRun.results.map((result, index) => {
                const metrics = getMetrics(result);
                return (
                  <div key={index} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">
                        Pass {index + 1}: {result.virtualRows ? 'Virtual ON' : 'Virtual OFF'}
                      </div>
                      <Badge variant={result.virtualRows ? 'success' : 'default'} size="sm">
                        {result.virtualRows ? 'Virtualized' : 'Classic'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <div className="text-gray-500">Mount Time</div>
                        <div className="font-mono">{metrics.mountTimeMs}ms</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Scroll FPS</div>
                        <div className="font-mono">{metrics.scrollFPS}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">DOM Ratio</div>
                        <div className="font-mono">{metrics.domRowRatio}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Memory</div>
                        <div className="font-mono">{metrics.memoryMB}MB</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {currentRun.completed && (
                <Button
                  onClick={() => downloadResults(currentRun)}
                  variant="secondary"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Results JSON
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historical Results */}
      {allRuns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Performance History
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allRuns.slice(-5).reverse().map(run => (
                <div key={run.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">Run {run.id}</div>
                    <div className="flex gap-2">
                      <Badge variant={run.completed ? 'success' : 'warning'} size="sm">
                        {run.completed ? 'Complete' : 'In Progress'}
                      </Badge>
                      {run.completed && (
                        <Button
                          onClick={() => downloadResults(run)}
                          variant="ghost"
                          size="sm"
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    {run.results.length} passes • {new Date(run.results[0]?.timestamp || '').toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Assertions */}
      <Card>
        <CardHeader>
          <CardTitle>Expected Performance Characteristics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>DOM Row Ratio (Virtual):</span>
              <Badge variant="success" size="sm">&lt; 0.2</Badge>
            </div>
            <div className="flex justify-between">
              <span>DOM Row Ratio (Flat):</span>
              <Badge variant="default" size="sm">≈ 1.0</Badge>
            </div>
            <div className="flex justify-between">
              <span>Scroll FPS (Virtual, 1k+):</span>
              <Badge variant="success" size="sm">&gt; 45</Badge>
            </div>
            <div className="flex justify-between">
              <span>Mount Time (Virtual vs Flat):</span>
              <Badge variant="success" size="sm">Similar or better</Badge>
            </div>
          </div>
          
          <div className="text-xs text-gray-500 mt-3 bg-gray-50 p-2 rounded">
            💡 Virtual rows should show significant DOM reduction and smoother scrolling 
            with datasets ≥1k. Mount time should remain competitive.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}