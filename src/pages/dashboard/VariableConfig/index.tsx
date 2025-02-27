/*
 * Copyright 2022 Nightingale Team
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import React, { useState, useEffect } from 'react';
import _ from 'lodash';
import classNames from 'classnames';
import { EditOutlined } from '@ant-design/icons';
import { IRawTimeRange } from '@/components/TimeRangePicker';
import { convertExpressionToQuery, replaceExpressionVars, getVaraiableSelected, setVaraiableSelected, stringToRegex } from './constant';
import { IVariable } from './definition';
import DisplayItem from './DisplayItem';
import EditItems from './EditItems';
import './index.less';

interface IProps {
  id: string;
  cluster: string; // 集群变动后需要重新获取数据
  editable?: boolean;
  value?: IVariable[];
  range: IRawTimeRange;
  onChange: (data: IVariable[], needSave: boolean, options?: IVariable[]) => void;
  onOpenFire?: () => void;
}

function includes(source, target) {
  if (_.isArray(target)) {
    return _.intersection(source, target);
  }
  return _.includes(source, target);
}

function index(props: IProps) {
  const { id, cluster, editable = true, range, onChange, onOpenFire } = props;
  const [editing, setEditing] = useState<boolean>(false);
  const [data, setData] = useState<IVariable[]>([]);
  const dataWithoutConstant = _.filter(data, (item) => item.type !== 'constant');
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refreshFlag_'));
  const value = _.map(props.value, (item) => {
    return {
      ...item,
      type: item.type || 'query',
    };
  });

  useEffect(() => {
    if (value) {
      let result: IVariable[] = [];
      try {
        (async () => {
          for (let idx = 0; idx < value.length; idx++) {
            const item = _.cloneDeep(value[idx]);
            if ((item.type === 'query' || item.type === 'custom') && item.definition) {
              const definition = idx > 0 ? replaceExpressionVars(item.definition, result, idx, id) : item.definition;
              const options = await convertExpressionToQuery(definition, range);
              const regFilterOptions = _.filter(options, (i) => !!i && (!item.reg || !stringToRegex(item.reg) || (stringToRegex(item.reg) as RegExp).test(i)));
              result[idx] = item;
              result[idx].fullDefinition = definition;
              result[idx].options = _.sortBy(regFilterOptions);
              // 当大盘变量值为空时，设置默认值
              // 如果已选项不在待选项里也视做空值处理
              const selected = getVaraiableSelected(item.name, id);
              if (selected === null || (selected && !_.isEmpty(regFilterOptions) && !includes(regFilterOptions, selected))) {
                const head = regFilterOptions?.[0];
                const defaultVal = item.multi ? (head ? [head] : []) : head;
                setVaraiableSelected({ name: item.name, value: defaultVal, id, urlAttach: true });
              }
            } else if (item.type === 'textbox') {
              result[idx] = item;
              const selected = getVaraiableSelected(item.name, id);
              if (selected === null) {
                setVaraiableSelected({ name: item.name, value: item.defaultValue, id, urlAttach: true });
              }
            } else if (item.type === 'constant') {
              result[idx] = item;
              const selected = getVaraiableSelected(item.name, id);
              if (selected === null) {
                setVaraiableSelected({ name: item.name, value: item.definition, id, urlAttach: true });
              }
            }
          }
          // 设置变量默认值，优先从 url 中获取，其次是 localStorage
          result = _.map(result, (item) => {
            return {
              ...item,
              value: getVaraiableSelected(item.name, id),
            };
          });
          setData(result);
          onChange(value, false, result);
        })();
      } catch (e) {
        console.log(e);
      }
    }
  }, [JSON.stringify(value), cluster, refreshFlag]);

  return (
    <div className='tag-area'>
      <div className={classNames('tag-content', 'tag-content-close')}>
        {_.map(dataWithoutConstant, (item) => {
          return (
            <DisplayItem
              key={item.name}
              expression={item}
              value={item.value}
              onChange={(val) => {
                // 缓存变量值，更新 url 里的变量值
                setVaraiableSelected({
                  name: item.name,
                  value: val,
                  id,
                  urlAttach: true,
                  vars: dataWithoutConstant,
                });
                setData(
                  _.map(data, (subItem) => {
                    if (subItem.name === item.name) {
                      return {
                        ...item,
                        value: val,
                      };
                    }
                    return subItem;
                  }),
                );
                setRefreshFlag(_.uniqueId('refreshFlag_'));
              }}
            />
          );
        })}
        {editable && (
          <EditOutlined
            className='icon'
            onClick={() => {
              setEditing(true);
              onOpenFire && onOpenFire();
            }}
          />
        )}
        {(data ? _.filter(data, (item) => item.type != 'constant')?.length === 0 : true) && editable && (
          <div
            className='add-variable-tips'
            onClick={() => {
              setEditing(true);
              onOpenFire && onOpenFire();
            }}
          >
            添加大盘变量
          </div>
        )}
      </div>
      <EditItems
        visible={editing}
        setVisible={setEditing}
        value={value}
        onChange={(v: IVariable[]) => {
          if (v) {
            onChange(v, true);
            setData(v);
          }
        }}
        range={range}
        id={id}
      />
    </div>
  );
}

export type { IVariable } from './definition';
export { replaceExpressionVars } from './constant';
export default React.memo(index);
