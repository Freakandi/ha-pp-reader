| PClient Schema | Field Index | Field Name | Data Format |
| --- | --- | --- | --- |
| PAccount | 1 | uuid | string |
| PAccount | 2 | name | string |
| PAccount | 3 | currencyCode | string |
| PAccount | 4 | note | optional string |
| PAccount | 5 | isRetired | bool |
| PAccount | 6 | attributes | array<PKeyValue> |
| PAccount | 7 | updatedAt | google.protobuf.Timestamp |
| PAnyValue | 1 | null | google.protobuf.NullValue |
| PAnyValue | 2 | string | string |
| PAnyValue | 3 | int32 | int32 |
| PAnyValue | 4 | int64 | int64 |
| PAnyValue | 5 | double | double |
| PAnyValue | 6 | bool | bool |
| PAnyValue | 7 | map | PMap |
| PAttributeType | 1 | id | string |
| PAttributeType | 2 | name | string |
| PAttributeType | 3 | columnLabel | string |
| PAttributeType | 4 | source | optional string |
| PAttributeType | 5 | target | string |
| PAttributeType | 6 | type | string |
| PAttributeType | 7 | converterClass | string |
| PAttributeType | 8 | properties | PMap |
| PBookmark | 1 | label | string |
| PBookmark | 2 | pattern | string |
| PClient | 1 | version | int32 |
| PClient | 2 | securities | array<PSecurity> |
| PClient | 3 | accounts | array<PAccount> |
| PClient | 4 | portfolios | array<PPortfolio> |
| PClient | 5 | transactions | array<PTransaction> |
| PClient | 6 | plans | array<PInvestmentPlan> |
| PClient | 7 | watchlists | array<PWatchlist> |
| PClient | 8 | taxonomies | array<PTaxonomy> |
| PClient | 9 | dashboards | array<PDashboard> |
| PClient | 10 | properties | map<string, string> |
| PClient | 11 | settings | PSettings |
| PClient | 12 | baseCurrency | string |
| PConfigurationSet | 1 | key | string |
| PConfigurationSet | 2 | uuid | string |
| PConfigurationSet | 3 | name | string |
| PConfigurationSet | 4 | data | string |
| PDashboard | 1 | name | string |
| PDashboard | 2 | configuration | map<string, string> |
| PDashboard | 3 | columns | array<PDashboard.Column> |
| PDashboard | 4 | id | string |
| PDashboard.Column | 1 | weight | int32 |
| PDashboard.Column | 2 | widgets | array<PDashboard.Widget> |
| PDashboard.Widget | 1 | type | string |
| PDashboard.Widget | 2 | label | string |
| PDashboard.Widget | 3 | configuration | map<string, string> |
| PDecimalValue | 1 | scale | uint32 |
| PDecimalValue | 2 | precision | uint32 |
| PDecimalValue | 3 | value | bytes |
| PECBData | 1 | lastModified | int64 |
| PECBData | 2 | series | array<PExchangeRateTimeSeries> |
| PExchangeRate | 1 | date | int64 |
| PExchangeRate | 2 | value | PDecimalValue |
| PExchangeRateTimeSeries | 1 | baseCurrency | string |
| PExchangeRateTimeSeries | 2 | termCurrency | string |
| PExchangeRateTimeSeries | 3 | exchangeRates | array<PExchangeRate> |
| PFullHistoricalPrice | 1 | date | int64 |
| PFullHistoricalPrice | 2 | close | int64 |
| PFullHistoricalPrice | 3 | high | int64 |
| PFullHistoricalPrice | 4 | low | int64 |
| PFullHistoricalPrice | 5 | volume | int64 |
| PHistoricalPrice | 1 | date | int64 |
| PHistoricalPrice | 2 | close | int64 |
| PInvestmentPlan | 1 | name | string |
| PInvestmentPlan | 2 | note | optional string |
| PInvestmentPlan | 3 | security | optional string |
| PInvestmentPlan | 4 | portfolio | optional string |
| PInvestmentPlan | 5 | account | optional string |
| PInvestmentPlan | 6 | attributes | array<PKeyValue> |
| PInvestmentPlan | 7 | autoGenerate | bool |
| PInvestmentPlan | 8 | date | int64 |
| PInvestmentPlan | 9 | interval | int32 |
| PInvestmentPlan | 10 | amount | int64 |
| PInvestmentPlan | 11 | fees | int64 |
| PInvestmentPlan | 12 | transactions | array<string> |
| PInvestmentPlan | 13 | taxes | int64 |
| PInvestmentPlan | 14 | type | PInvestmentPlan.Type |
| PKeyValue | 1 | key | string |
| PKeyValue | 2 | value | PAnyValue |
| PMap | 1 | entries | array<PKeyValue> |
| PPortfolio | 1 | uuid | string |
| PPortfolio | 2 | name | string |
| PPortfolio | 3 | note | optional string |
| PPortfolio | 4 | isRetired | bool |
| PPortfolio | 5 | referenceAccount | optional string |
| PPortfolio | 6 | attributes | array<PKeyValue> |
| PPortfolio | 7 | updatedAt | google.protobuf.Timestamp |
| PSecurity | 1 | uuid | string |
| PSecurity | 2 | onlineId | optional string |
| PSecurity | 3 | name | string |
| PSecurity | 4 | currencyCode | optional string |
| PSecurity | 5 | targetCurrencyCode | optional string |
| PSecurity | 6 | note | optional string |
| PSecurity | 7 | isin | optional string |
| PSecurity | 8 | tickerSymbol | optional string |
| PSecurity | 9 | wkn | optional string |
| PSecurity | 10 | calendar | optional string |
| PSecurity | 11 | feed | optional string |
| PSecurity | 12 | feedURL | optional string |
| PSecurity | 13 | prices | array<PHistoricalPrice> |
| PSecurity | 14 | latestFeed | optional string |
| PSecurity | 15 | latestFeedURL | optional string |
| PSecurity | 16 | latest | optional PFullHistoricalPrice |
| PSecurity | 17 | attributes | array<PKeyValue> |
| PSecurity | 18 | events | array<PSecurityEvent> |
| PSecurity | 19 | properties | array<PKeyValue> |
| PSecurity | 20 | isRetired | bool |
| PSecurity | 21 | updatedAt | google.protobuf.Timestamp |
| PSecurityEvent | 1 | type | PSecurityEvent.Type |
| PSecurityEvent | 2 | date | int64 |
| PSecurityEvent | 3 | details | string |
| PSecurityEvent | 4 | data | array<PAnyValue> |
| PSecurityEvent | 5 | source | string |
| PSettings | 1 | bookmarks | array<PBookmark> |
| PSettings | 2 | attributeTypes | array<PAttributeType> |
| PSettings | 3 | configurationSets | array<PConfigurationSet> |
| PTaxonomy | 1 | id | string |
| PTaxonomy | 2 | name | string |
| PTaxonomy | 3 | source | optional string |
| PTaxonomy | 4 | dimensions | array<string> |
| PTaxonomy | 5 | classifications | array<PTaxonomy.Classification> |
| PTaxonomy.Assignment | 1 | investmentVehicle | string |
| PTaxonomy.Assignment | 2 | weight | int32 |
| PTaxonomy.Assignment | 3 | rank | int32 |
| PTaxonomy.Assignment | 4 | data | array<PKeyValue> |
| PTaxonomy.Classification | 1 | id | string |
| PTaxonomy.Classification | 2 | parentId | optional string |
| PTaxonomy.Classification | 3 | name | string |
| PTaxonomy.Classification | 4 | note | optional string |
| PTaxonomy.Classification | 5 | color | string |
| PTaxonomy.Classification | 6 | weight | int32 |
| PTaxonomy.Classification | 7 | rank | int32 |
| PTaxonomy.Classification | 8 | data | array<PKeyValue> |
| PTaxonomy.Classification | 9 | assignments | array<PTaxonomy.Assignment> |
| PTransaction | 1 | uuid | string |
| PTransaction | 2 | type | PTransaction.Type |
| PTransaction | 3 | account | optional string |
| PTransaction | 4 | portfolio | optional string |
| PTransaction | 5 | otherAccount | optional string |
| PTransaction | 6 | otherPortfolio | optional string |
| PTransaction | 7 | otherUuid | optional string |
| PTransaction | 8 | otherUpdatedAt | optional google.protobuf.Timestamp |
| PTransaction | 9 | date | google.protobuf.Timestamp |
| PTransaction | 10 | currencyCode | string |
| PTransaction | 11 | amount | int64 |
| PTransaction | 12 | shares | optional int64 |
| PTransaction | 13 | note | optional string |
| PTransaction | 14 | security | optional string |
| PTransaction | 15 | units | array<PTransactionUnit> |
| PTransaction | 16 | updatedAt | google.protobuf.Timestamp |
| PTransaction | 17 | source | optional string |
| PTransactionUnit | 1 | type | PTransactionUnit.Type |
| PTransactionUnit | 2 | amount | int64 |
| PTransactionUnit | 3 | currencyCode | string |
| PTransactionUnit | 4 | fxAmount | optional int64 |
| PTransactionUnit | 5 | fxCurrencyCode | optional string |
| PTransactionUnit | 6 | fxRateToBase | optional PDecimalValue |
| PWatchlist | 1 | name | string |
| PWatchlist | 2 | securities | array<string> |
