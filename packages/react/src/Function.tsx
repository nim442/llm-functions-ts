'use client';
import './index.css';

import {
  CommandLineIcon,
  CpuChipIcon,
  FireIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import {
  FunctionArgs,
  ProcedureBuilderDef,
  DocumentWithoutInput,
  Execution,
  createFn,
  Registry,
} from 'llm-functions-ts';
import * as Form from '@radix-ui/react-form';
import { parseFString } from 'llm-functions-ts';
import { Instructions } from './Instructions';
import { useState } from 'react';

import { DocumentUploader } from './DocumentUploader';

import TraceComponent from './Trace';

import classNames from 'classnames';
import * as Tabs from '@radix-ui/react-tabs';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { vs2015 as theme } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import { FormField, Input } from './FormField';
import { Store, TABS, tabsLabels, useStore } from './store';
import { LogsTable } from './LogsTable';

import * as Switch from '@radix-ui/react-switch';
import { useInternalStore } from './internalStore';

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement>
> = ({ className, ...props }) => {
  return (
    <div className={classNames(className, 'relative w-full group')}>
      <div
        className={classNames(
          'absolute  w-full h-full top-0  rounded-full transition-all duration-300 blur-md group-hover:opacity-100 opacity-0',
          'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-100 via-sky-300 to-sky-500'
        )}
      ></div>
      <button
        className={classNames(
          'button bg-white text-black font-semibold py-2 px-4 rounded w-full cursor-pointer z-10 relative'
        )}
        {...props}
      />
    </div>
  );
};

export type FunctionProps = {
  logs?: Execution<any>[];
  aiFunction: ProcedureBuilderDef;
  evaluateDataset?: Registry['evaluateDataset'];
  evaluateFn?: Registry['evaluateFn'];
} & Partial<Store>;

export const Function: React.FC<FunctionProps> = ({
  aiFunction,
  evaluateDataset,
  evaluateFn,
  ...props
}) => {
  const id = aiFunction.id;
  if (!id) return <>'Missing id'</>;
  const input = parseFString(aiFunction.instructions || '');
  const inputVariables = input.filter((d) => d.type == 'variable') as {
    type: 'variable';
    name: string;
  }[];

  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<Execution<any>[]>();

  const [runtimeArgs, setRuntimeArgs] = useState<FunctionArgs>({});
  const [applyDataSet] = useState(false);
  const selectedTab = useStore((s) => props.selectedTab || s.selectedTab);
  const setSelectedTab = useStore(
    (s) => props.setSelectedTab || s.setSelectedTab
  );
  const generateResponse = async (
    e: React.MouseEvent<HTMLButtonElement>,
    i: string
  ) => {
    e.preventDefault();
    if (applyDataSet) {
    } else {
      const response = await (evaluateFn
        ? evaluateFn(i, runtimeArgs, (t) => {
            setResponse((resp) => {
              const r = resp?.find((d) => d.id === t.id);
              if (r) {
                return resp?.map((d) => (d.id === t.id ? t : d));
              }
              return [...(resp || []), t];
            });
          })
        : createFn(aiFunction, (t) => {
            setResponse((resp) => {
              const r = resp?.find((d) => d.id === t.id);
              if (r) {
                return resp?.map((d) => (d.id === t.id ? t : d));
              }
              return [...(resp || []), t];
            });
          }).run(runtimeArgs));
      setLoading(false);
      setResponse((resp) => {
        const r = resp?.find((d) => d.id === response.id);
        if (r) {
          return resp?.map((d) => (d.id === response.id ? response : d));
        }
        return [...(resp || []), response];
      });
    }
  };
  const enableTableView = useInternalStore((s) => s.enableTableView);
  const toggleEnableTableView = useInternalStore(
    (s) => s.toggleEnableTableView
  );
  const handleEvaluateDatasetClick = async () => {
    if (evaluateDataset) {
      const response = await evaluateDataset(id);
      setResponse(response);
    } else {
      setLoading(true);
      const response = await createFn(aiFunction, (t) => {
        setResponse((resp) => {
          const r = resp?.find((d) => d.id === t.id);
          if (r) {
            return resp?.map((d) => (d.id === t.id ? t : d));
          }
          return [...(resp || []), t];
        });
      }).runDataset();

      setResponse(response);
      setLoading(false);
    }
  };

  return (
    <Tabs.Root
      value={selectedTab}
      onValueChange={(v) => setSelectedTab(v as Store['selectedTab'])}
      className="flex flex-col flex-1 h-full overflow-hidden"
      defaultValue="tab1"
    >
      <div className="px-4 border-b border-neutral-800">
        <div className="py-4 w-full justify-center flex flex-col">
          <div className="flex justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex gap-1 items-center">
                <CommandLineIcon className="w-6 h-6 text-white" />
                <div className="text-white text-lg">
                  {aiFunction.name || 'AI function'}
                </div>
              </div>
              <div className="text-neutral-500 text-sm">
                {aiFunction.description}
              </div>
            </div>
            <div className="flex gap-2">
              <label className="text-sm text-neutral-500" htmlFor="table-view">
                JSON view
              </label>
              <Switch.Root
                checked={enableTableView}
                onCheckedChange={toggleEnableTableView}
                className="w-8 h-5 bg-neutral-800 rounded-full"
                id="table-view"
              >
                <Switch.Thumb className="data-[state='checked']:translate-x-[14px] translate-x-[2px] block w-4 h-4 bg-white rounded-full transition-all" />
              </Switch.Root>
              <label className="text-sm text-neutral-500" htmlFor="table-view">
                Table view
              </label>
            </div>
          </div>
        </div>
        <Tabs.List className="gap-4 flex text-sm">
          {TABS.map((tab) => (
            <Tabs.Trigger
              key={tab}
              className="data-[state=active]:text-white data-[state=active]:border-b text-neutral-500 py-2"
              value={tab}
            >
              {tabsLabels[tab]}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </div>

      <Tabs.Content
        className="flex overflow-auto h-full data-[state='inactive']:hidden"
        value={'PLAYGROUND' satisfies Store['selectedTab']}
      >
        <Form.Root className="w-full p-6 flex gap-4 flex-col border-r border-neutral-800 max-w-[400px] justify-between overflow-auto h-full">
          <div className="flex flex-col gap-4 text-neutral-200">
            {/* MODEL INFO */}
            <div className="flex gap-2">
              <div className="text-xs  bg-neutral-800 border-[0.5px] border-neutral-700 rounded flex gap-1 items-center p-2 w-fit">
                <CpuChipIcon className="w-5 h-5"></CpuChipIcon>
                {aiFunction.model?.modelName}
              </div>
              <div className="text-xs  bg-neutral-800 border-[0.5px] border-neutral-700 rounded flex gap-1 items-center p-2 w-fit">
                <FireIcon className="w-5 h-5" />
                {aiFunction.model?.temperature}
              </div>
            </div>
            {/* VARIABLES */}
            {inputVariables.map((d) => (
              <FormField
                label={d.name}
                control={
                  <Input
                    value={runtimeArgs?.instructions?.[d.name]}
                    onChange={(e) =>
                      setRuntimeArgs({
                        ...runtimeArgs,
                        instructions: {
                          ...runtimeArgs.instructions,
                          [d.name]: e.target.value,
                        },
                      })
                    }
                  />
                }
              />
            ))}

            {aiFunction.query?.queryInput && (
              <FormField
                label="query"
                control={
                  <Input
                    disabled={applyDataSet}
                    value={runtimeArgs?.query}
                    onChange={(e) =>
                      setRuntimeArgs({
                        ...runtimeArgs,
                        query: e.target.value,
                      })
                    }
                  />
                }
              />
            )}
            <div>
              {aiFunction.documents && (
                <DocumentUploader
                  runtimeArgs={runtimeArgs}
                  setRuntimeArgs={setRuntimeArgs}
                  documents={aiFunction.documents as DocumentWithoutInput[]}
                ></DocumentUploader>
              )}
            </div>
            {aiFunction.instructions && (
              <div className="flex gap-1 flex-col">
                <div className="text-sm text-neutral-500">Instructions</div>

                <Instructions
                  runtimeArgs={runtimeArgs}
                  instructions={input}
                ></Instructions>
              </div>
            )}

            {/* </Parameters> */}
            <div>
              <div className="text-sm text-neutral-500 mb-1">
                Expected output
              </div>
              <div
                className={classNames(
                  'whitespace-break-spaces [&>pre]:!bg-transparent text-sm',
                  'bg-neutral-800 rounded p-2'
                )}
              >
                <SyntaxHighlighter style={theme} language="typescript">
                  {aiFunction.tsOutputString || 'string'}
                </SyntaxHighlighter>
              </div>
            </div>
          </div>

          <Button
            type="button"
            onClick={async (e) => {
              generateResponse(e, id);
              setLoading(true);
            }}
          >
            <span className="flex relative justify-center items-center group-hover:text-sky-600 transition-all">
              Evaluate
              {loading && (
                <ArrowPathIcon className="w-4 h-4 animate-spin absolute right-0" />
              )}
            </span>
          </Button>
        </Form.Root>
        {response && <TraceComponent data={response} />}
      </Tabs.Content>
      <Tabs.Content
        className="flex overflow-auto h-full data-[state='inactive']:hidden"
        value={'DATASET' satisfies Store['selectedTab']}
      >
        {aiFunction.dataset ? (
          <div className="w-full">
            <div className="flex justify-between p-4 border-b border-neutral-800">
              <div className="text-white">
                <div className="text-white">Dataset</div>
                <div className="text-neutral-500 text-sm">
                  Last ran: yesterday
                </div>
              </div>
              <Button
                className="!w-fit"
                type="button"
                onClick={handleEvaluateDatasetClick}
              >
                <span className="flex relative justify-center items-center">
                  Evaluate dataset
                  {loading && (
                    <ArrowPathIcon className="w-4 h-4 animate-spin absolute right-0" />
                  )}
                </span>
              </Button>
            </div>
            <LogsTable data={response} />
          </div>
        ) : (
          <div className=" text-white font-semibold flex items-center justify-center h-full w-full">
            No dataset
          </div>
        )}
      </Tabs.Content>
      <Tabs.Content
        className="flex overflow-auto h-full data-[state='inactive']:hidden"
        value={'LOGS' satisfies Store['selectedTab']}
      >
        <LogsTable data={props.logs} />
      </Tabs.Content>
    </Tabs.Root>
  );
};
