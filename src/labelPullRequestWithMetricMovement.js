'use strict'

const GitHubApi = require('@octokit/rest')

/*
{
  githubToken: '...github access token...',
  ownerAndRepo: 'holidayextras/tripapplite',
  prNumber: 1234,
  metrics: {
    previous: 2044,
    current: 2120
  },

  // Is a "good" result that the metric goes up (for example, code coverage)
  // or down (for example, page weight or benchmark run time)?
  desirableTrajectory: ('INCREASE'|'DECREASE')

  // Labels of 5 states (major/minor improvement/detraction and no change)
  // can be applied based on the metric moving by a raw value or a percentage.
  minorPercentageThreshold: 2,
  minorValueThreshold: 5,
  majorPercentageThreshold: 5,
  majorValueThreshold: 10,

  // The labels and colours can be overriden completely...
  labels: [
    'Major detraction',
    'Minor detraction',
    'No significant impact',
    'Minor improvement',
    'Major improvement'
  ],

  // ...or clarified with the name of the metric (which will be appended
  // before the last word in the default label)
  labelModifier: 'parse time',

  labelColours: [
    'b70000',
    'b78000',
    'b5b7b5',
    'b7b100',
    '00b700'
  ]
}
*/

module.exports = options => {
  const owner = options.ownerAndRepo.split('/')[0]
  const repo = options.ownerAndRepo.split('/')[1]
  const number = options.prNumber
  const previousMetric = options.metrics.previous
  const currentMetric = options.metrics.current

  options.labels = options.labels || [
    'Major detraction',
    'Minor detraction',
    'No significant impact',
    'Minor improvement',
    'Major improvement'
  ]

  options.labelColours = options.labelColours || [
    'b70000',
    'b78000',
    'b5b7b5',
    'b7b100',
    '00b700'
  ]

  if (options.labelModifier) {
    options.labels = options.labels
      .map(label => label.replace(/ (\w+)$/, ` ${options.labelModifier} $1`))
  }

  const valueDiff = currentMetric - previousMetric
  const percentDiff = (((currentMetric / previousMetric) * 100) - 100).toFixed(2)

  // The labels are in the human-readable "worst to best" order, but `thresholdMapping`
  // is ordered "most to least dramatic"; if multiple items match (for example, if
  // the metric increased 20%, it's above both a minor 5% and a major 15%) we want the
  // most relevant one (15%) to be first in the array so it's easy to decide which to
  // use
  let thresholdMappingToLabelMapping = [ 0, 4, 1, 3, 2 ]
  let thresholdMapping = [
    [ -options.majorValueThreshold, -options.majorPercentageThreshold ],
    [ options.majorValueThreshold, options.majorPercentageThreshold ],
    [ -options.minorValueThreshold, -options.minorPercentageThreshold ],
    [ options.minorValueThreshold, options.minorPercentageThreshold ],
    [ 0, 0 ]
  ]

  if (options.desirableTrajectory === 'DECREASE') {
    thresholdMapping = thresholdMapping.map(values => [ -values[0], -values[1] ])
  }

  const thresholdMappingMatches = thresholdMapping.map(mapping => {
    const valueMatchesThreshold = mapping[0] === 0 || (valueDiff > 0 && mapping[0] > 0 && valueDiff >= mapping[0]) || (valueDiff < 0 && mapping[0] < 0 && valueDiff <= mapping[0])
    const percentMatchesThreshold = mapping[1] === 0 || (percentDiff > 0 && mapping[1] > 0 && percentDiff >= mapping[0]) || (percentDiff < 0 && mapping[1] < 0 && percentDiff <= mapping[0])

    return valueMatchesThreshold || percentMatchesThreshold
  })

  let labelIndex
  thresholdMappingMatches.some((matches, index) => {
    labelIndex = thresholdMappingToLabelMapping[index]
    return matches
  })
  const name = options.labels[labelIndex]
  const color = options.labelColours[labelIndex]

  const github = new GitHubApi()

  github.authenticate({
    type: 'token',
    token: options.githubToken
  })

  return github.issues.getIssueLabels({ owner, repo, number }).then(labelsAlreadyOnIssue => {
    const labelIsAlreadyApplied = Boolean(labelsAlreadyOnIssue.data.filter(label => {
      return label.name === name
    }).length)

    const removeLabelsPromises = Promise.all(labelsAlreadyOnIssue.data.filter(label => {
      return label.name !== name && options.labels.indexOf(label.name) !== -1
    }).map(label => {
      const name = label.name
      return github.issues.removeLabel({ owner, repo, number, name })
    }))

    if (labelIsAlreadyApplied) {
      return removeLabelsPromises
    }

    return removeLabelsPromises.then(() => {
      const per_page = 100 // eslint-disable-line camelcase
      return github.issues.getLabels({ owner, repo, per_page })
    }).then(availableLabelsForRepo => {
      return availableLabelsForRepo.data.filter(label => label.name === name)[0]
    }).then(maybeExistingLabel => {
      if (maybeExistingLabel) return Promise.resolve({ data: maybeExistingLabel })
      return github.issues.createLabel({ owner, repo, name, color })
    }).then(response => {
      const labels = [response.data]
      return github.issues.addLabels({ owner, repo, number, labels })
    })
  })
}
