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
import { Table, Space, Button, Popover, Select } from 'antd';
import Icon from '@ant-design/icons';
import moment from 'moment';
import { useSelector } from 'react-redux';
import PageLayout from '@/components/pageLayout';
import { getN9EServers, updateN9EServerCluster } from '@/services/help';
import { getCommonClusters } from '@/services/common';
import { RootState as AccountRootState, accountStoreState } from '@/store/accountInterface';
import SystemInfoSvg from '../../../../public/image/system-info.svg';

function ClusterEditor({ id, defaultValue, clusters, onSave }) {
  const [visible, setVisible] = useState(false);
  const [cluster, setCluster] = useState(defaultValue);

  return (
    <Popover
      visible={visible}
      onVisibleChange={(newVisible) => {
        setVisible(newVisible);
      }}
      destroyTooltipOnHide
      content={
        <Space>
          <Select
            style={{ minWidth: 200 }}
            placeholder='选择集群'
            allowClear
            value={cluster}
            onChange={(val) => {
              setCluster(val);
            }}
          >
            {clusters.map((item) => {
              return (
                <Select.Option key={item} value={item}>
                  {item}
                </Select.Option>
              );
            })}
          </Select>
          <Button
            type='primary'
            onClick={() => {
              updateN9EServerCluster(id, {
                cluster: cluster || '',
              }).then(() => {
                onSave();
                setVisible(false);
              });
            }}
          >
            保存
          </Button>
        </Space>
      }
      title='修改集群'
      trigger='click'
    >
      <Button type='link'>修改集群</Button>
    </Popover>
  );
}

export default function Migrate() {
  const { profile } = useSelector<AccountRootState, accountStoreState>((state) => state.account);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [clusters, setClusters] = useState([]);
  const fetchData = () => {
    getN9EServers()
      .then((res) => {
        setData(res.dat);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    getCommonClusters().then((res) => {
      setClusters(res.dat);
    });
    fetchData();
  }, []);

  console.log('profile', profile);

  return (
    <PageLayout
      title={
        <>
          <Icon component={SystemInfoSvg as any} /> 告警引擎
        </>
      }
      hideCluster
    >
      <div style={{ padding: 10 }}>
        <div style={{ padding: 20 }}>
          {profile.admin ? (
            <Table
              rowKey='id'
              loading={loading}
              dataSource={data}
              pagination={false}
              columns={[
                {
                  title: '引擎实例',
                  dataIndex: 'instance',
                  key: 'instance',
                },
                {
                  title: '告警集群',
                  dataIndex: 'cluster',
                  key: 'cluster',
                },
                {
                  title: '上次心跳时间',
                  dataIndex: 'clock',
                  key: 'clock',
                  render: (text) => {
                    return moment.unix(text).format('YYYY-MM-DD HH:mm:ss');
                  },
                },
                {
                  title: '操作',
                  render: (record) => {
                    return (
                      <Space>
                        <ClusterEditor
                          id={record.id}
                          defaultValue={record.cluster || undefined}
                          clusters={clusters}
                          onSave={() => {
                            fetchData();
                          }}
                        />
                      </Space>
                    );
                  },
                },
              ]}
            />
          ) : (
            <div>您没有权限查看</div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
