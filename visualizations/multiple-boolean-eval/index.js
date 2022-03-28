import React from "react";
import PropTypes from "prop-types";
import {
  Card,
  CardBody,
  HeadingText,
  NrqlQuery,
  Spinner,
  AutoSizer,
  BillboardChart,
} from "nr1";

export default class MultipleNrqlVisualization extends React.Component {
  // Custom props you wish to be configurable in the UI must also be defined in
  // the nr1.json file for the visualization. See docs for more details.
  static propTypes = {
    nrqlQueries: PropTypes.arrayOf(
      PropTypes.shape({
        accountId: PropTypes.number,
        query: PropTypes.string,
        label: PropTypes.string,
        threshold: PropTypes.number,
      })
    ),
  };

  constructor(props) {
    super(props);
    this.booleanResults = [];
    this.finalBool = false;
  }

  transformData = (rawData, threshold, label, i) => {
    let output = false;
    if (rawData[0] && rawData[0].data[0]) {
      output = rawData[0].data[0].y <= threshold;
      let r = {
        label: label,
        value: output,
        index: i
      };
      i <= this.booleanResults.length-1 ? this.booleanResults.splice(i, 1, r) : this.booleanResults.push(r);
    }

    const transformedData = [
      {
        metadata: {
          id: "series-1",
          name: label,
          viz: "main",
        },
        data: [
          { y: output.toString() }, // Current value.
        ],
      },
    ];
    
    // final data
    console.log(JSON.stringify(this.booleanResults));
    if (this.booleanResults && this.booleanResults.length > 0) {
      if (this.booleanResults.length == 1) {
        this.finalBool = this.booleanResults[0].value;
      } else {
        let previous = this.booleanResults[0].value;
        for (let i = 1; i < this.booleanResults.length; i++) {
          let current = this.booleanResults[i].value;
          this.finalBool = previous && current;
          if (!this.finalBool) break;
          previous = this.finalBool;
        }
      }
    }
    console.log("Final value: ", this.finalBool);

    const finalOutput = [
      {
        metadata: {
          id: "series-1",
          name: "Combined output",
          viz: "main",
        },
        data: [
          { y: this.finalBool.toString() }, // Current value.
        ],
      },
    ];
    
    return {transformedData, finalOutput};
  };

  render() {
    const { nrqlQueries } = this.props;

    const nrqlQueryPropsAvailable =
      nrqlQueries &&
      nrqlQueries[0] &&
      nrqlQueries[0].accountId &&
      nrqlQueries[0].query &&
      nrqlQueries[0].label &&
      nrqlQueries[0].threshold;

    if (!nrqlQueryPropsAvailable) {
      return <EmptyState />;
    }

    let results = [];

    for (let i = 0; i < nrqlQueries.length; i++) {
      const nrqlQuery = nrqlQueries[i];
      results.push(
        <NrqlQuery
          query={nrqlQuery.query}
          accountId={parseInt(nrqlQuery.accountId)}
          pollInterval={NrqlQuery.AUTO_POLL_INTERVAL}
        >
          {({ data, loading, error }) => {
            if (loading) {
              return <Spinner />;
            }

            if (error) {
              return <ErrorState />;
            }

            const {transformedData, finalOutput} = this.transformData(
              data,
              nrqlQuery.threshold,
              nrqlQuery.label,
              i
            );

            if (i == nrqlQueries.length - 1) {
              return <>
              <BillboardChart data={transformedData}></BillboardChart>;
              <BillboardChart data={finalOutput}></BillboardChart>
              </> 
            } else {
              return <>
              <BillboardChart data={transformedData}></BillboardChart>
              </> 
            }
          }}
        </NrqlQuery>
      );
    }
    return results;
  }
}

const EmptyState = () => (
  <Card className="EmptyState">
    <CardBody className="EmptyState-cardBody">
      <HeadingText
        spacingType={[HeadingText.SPACING_TYPE.LARGE]}
        type={HeadingText.TYPE.HEADING_3}
      >
        Please provide at least one NRQL query & threshold pair
      </HeadingText>
      <HeadingText
        spacingType={[HeadingText.SPACING_TYPE.MEDIUM]}
        type={HeadingText.TYPE.HEADING_4}
      >
        An example NRQL query you can try is:
      </HeadingText>
      <code>SELECT average(`apm.service.cpu.usertime.utilization`) FROM Metric WHERE appName = 'Promo Service'</code>
    </CardBody>
  </Card>
);

const ErrorState = () => (
  <Card className="ErrorState">
    <CardBody className="ErrorState-cardBody">
      <HeadingText
        className="ErrorState-headingText"
        spacingType={[HeadingText.SPACING_TYPE.LARGE]}
        type={HeadingText.TYPE.HEADING_3}
      >
        Oops! Something went wrong.
      </HeadingText>
    </CardBody>
  </Card>
);
