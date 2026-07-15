// aliasName defaults to metricRowCondition, for the common case where the raw
// metric/action value already matches the desired output column name. String
// conditions are quoted automatically; numeric conditions (e.g. a "second"
// offset column) are left unquoted.
const maxIfConditionValueNotNull = (metricColumnName, metricRowCondition, valueColumn, aliasName = metricRowCondition) => {
  const conditionLiteral = typeof metricRowCondition === 'number' ? metricRowCondition : `'${metricRowCondition}'`;
  return `MAX(IF(${metricColumnName} = ${conditionLiteral}, ${valueColumn}, NULL)) AS ${aliasName}`;
};

module.exports = {
  maxIfConditionValueNotNull
};